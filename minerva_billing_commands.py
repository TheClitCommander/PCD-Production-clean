"""
Minerva Billing Commands - Natural Language Interface
Allows Minerva to handle billing through conversational commands
"""

import logging
from typing import Dict, List, Optional
import requests
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class MinervaBillingCommands:
    def __init__(self, billing_api="http://localhost:8007/api", pleasant_cove_api="http://localhost:3000/api"):
        self.billing_api = billing_api
        self.pleasant_cove_api = pleasant_cove_api
        logger.info("💰 Minerva Billing Commands initialized")

    def search_company(self, query: str) -> List[Dict]:
        """Search for a company by name or partial match"""
        try:
            response = requests.get(f"{self.pleasant_cove_api}/companies/search", params={"q": query})
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            logger.error(f"Error searching companies: {e}")
            return []

    def create_invoice_for_company(self, company_name: str, package: str, notes: str = None) -> Dict:
        """
        Natural language: "Create an invoice for Bob's Plumbing for the Growth package"
        """
        # Search for company
        companies = self.search_company(company_name)
        if not companies:
            return {"error": f"No company found matching '{company_name}'"}
        
        # Use first match
        company = companies[0]
        
        # Create invoice
        try:
            response = requests.post(f"{self.billing_api}/invoices", json={
                "company_id": company['id'],
                "service_package": package.lower(),
                "notes": notes
            })
            
            if response.status_code == 201:
                invoice = response.json()
                return {
                    "success": True,
                    "message": f"Created invoice {invoice['invoice_id']} for {company['name']}",
                    "invoice": invoice,
                    "total": f"${invoice['total']:,.2f}",
                    "due_date": invoice['due_date'][:10]
                }
            else:
                return {"error": "Failed to create invoice"}
                
        except Exception as e:
            logger.error(f"Error creating invoice: {e}")
            return {"error": str(e)}

    def send_invoice_to_client(self, company_name: str) -> Dict:
        """
        Natural language: "Send the invoice to Bob's Plumbing"
        """
        # Find company and their latest invoice
        companies = self.search_company(company_name)
        if not companies:
            return {"error": f"No company found matching '{company_name}'"}
        
        company = companies[0]
        
        # Get company's invoices
        try:
            response = requests.get(f"{self.billing_api}/companies/{company['id']}/invoices")
            if response.status_code == 200:
                invoices = response.json()
                if not invoices:
                    return {"error": f"No invoices found for {company['name']}"}
                
                # Find latest draft invoice
                draft_invoices = [inv for inv in invoices if inv['status'] == 'draft']
                if not draft_invoices:
                    return {"error": f"No unsent invoices for {company['name']}"}
                
                latest = draft_invoices[0]
                
                # Send it
                send_response = requests.post(f"{self.billing_api}/invoices/{latest['invoice_id']}/send")
                if send_response.status_code == 200:
                    return {
                        "success": True,
                        "message": f"Sent invoice {latest['invoice_id']} to {company['name']} ({latest['company_email']})",
                        "amount": f"${latest['total']:,.2f}"
                    }
                    
        except Exception as e:
            logger.error(f"Error sending invoice: {e}")
            return {"error": str(e)}

    def record_payment_from_company(self, company_name: str, amount: float = None, method: str = "bank_transfer") -> Dict:
        """
        Natural language: "Bob's Plumbing paid their invoice" or "Record $2,497 payment from Bob's Plumbing via Stripe"
        """
        # Find company
        companies = self.search_company(company_name)
        if not companies:
            return {"error": f"No company found matching '{company_name}'"}
        
        company = companies[0]
        
        # Get unpaid invoices
        try:
            response = requests.get(f"{self.billing_api}/companies/{company['id']}/invoices")
            if response.status_code == 200:
                invoices = response.json()
                unpaid = [inv for inv in invoices if inv['status'] != 'paid' and inv.get('balance_due', 0) > 0]
                
                if not unpaid:
                    return {"error": f"No unpaid invoices for {company['name']}"}
                
                # Use most recent unpaid
                invoice = unpaid[0]
                
                # If no amount specified, pay in full
                if amount is None:
                    amount = invoice['balance_due']
                
                # Record payment
                payment_response = requests.post(f"{self.billing_api}/payments", json={
                    "invoice_id": invoice['invoice_id'],
                    "amount": amount,
                    "method": method
                })
                
                if payment_response.status_code == 201:
                    payment = payment_response.json()
                    return {
                        "success": True,
                        "message": f"Recorded ${amount:,.2f} payment from {company['name']}",
                        "payment_id": payment['payment_id'],
                        "invoice": invoice['invoice_id'],
                        "receipt": "Receipt will be emailed automatically"
                    }
                    
        except Exception as e:
            logger.error(f"Error recording payment: {e}")
            return {"error": str(e)}

    def check_who_owes_money(self, timeframe: str = None) -> Dict:
        """
        Natural language: "Who still owes money?" or "Show me unpaid invoices from July"
        """
        try:
            response = requests.get(f"{self.billing_api}/invoices/outstanding")
            if response.status_code == 200:
                invoices = response.json()
                
                if not invoices:
                    return {"message": "All invoices are paid! 🎉"}
                
                # Filter by timeframe if specified
                if timeframe:
                    # Simple month parsing
                    if "july" in timeframe.lower():
                        invoices = [inv for inv in invoices if "-07-" in inv['date_issued']]
                    elif "august" in timeframe.lower():
                        invoices = [inv for inv in invoices if "-08-" in inv['date_issued']]
                    # Add more months as needed
                
                # Format summary
                total_outstanding = sum(inv['balance_due'] for inv in invoices)
                
                summary = {
                    "total_outstanding": f"${total_outstanding:,.2f}",
                    "count": len(invoices),
                    "invoices": []
                }
                
                for inv in invoices[:10]:  # Limit to 10 for readability
                    summary["invoices"].append({
                        "company": inv['company_name'],
                        "invoice": inv['invoice_id'],
                        "amount_due": f"${inv['balance_due']:,.2f}",
                        "days_overdue": (datetime.now() - datetime.fromisoformat(inv['due_date'])).days if inv['due_date'] < datetime.now().isoformat() else 0
                    })
                
                return summary
                
        except Exception as e:
            logger.error(f"Error checking outstanding invoices: {e}")
            return {"error": str(e)}

    def get_company_billing_history(self, company_name: str) -> Dict:
        """
        Natural language: "Show me Bob's Plumbing billing history"
        """
        # Find company
        companies = self.search_company(company_name)
        if not companies:
            return {"error": f"No company found matching '{company_name}'"}
        
        company = companies[0]
        
        try:
            response = requests.get(f"{self.billing_api}/companies/{company['id']}/invoices")
            if response.status_code == 200:
                invoices = response.json()
                
                if not invoices:
                    return {"message": f"No billing history for {company['name']}"}
                
                total_billed = sum(inv['total'] for inv in invoices)
                total_paid = sum(inv['total_paid'] for inv in invoices)
                
                history = {
                    "company": company['name'],
                    "total_billed": f"${total_billed:,.2f}",
                    "total_paid": f"${total_paid:,.2f}",
                    "balance": f"${(total_billed - total_paid):,.2f}",
                    "invoice_count": len(invoices),
                    "recent_invoices": []
                }
                
                for inv in invoices[:5]:  # Last 5 invoices
                    history["recent_invoices"].append({
                        "invoice": inv['invoice_id'],
                        "date": inv['date_issued'][:10],
                        "amount": f"${inv['total']:,.2f}",
                        "status": inv['status'],
                        "paid": f"${inv['total_paid']:,.2f}"
                    })
                
                return history
                
        except Exception as e:
            logger.error(f"Error getting billing history: {e}")
            return {"error": str(e)}

    def create_custom_invoice(self, company_name: str, items: List[Dict]) -> Dict:
        """
        Natural language: "Create custom invoice for Bob's Plumbing: $500 for SEO, $300 for hosting"
        """
        # Search for company
        companies = self.search_company(company_name)
        if not companies:
            return {"error": f"No company found matching '{company_name}'"}
        
        company = companies[0]
        
        # Parse custom items
        custom_items = []
        for item in items:
            custom_items.append({
                "description": item.get("description", "Custom service"),
                "quantity": 1,
                "unit_price": item.get("amount", 0),
                "total": item.get("amount", 0)
            })
        
        try:
            response = requests.post(f"{self.billing_api}/invoices", json={
                "company_id": company['id'],
                "custom_items": custom_items
            })
            
            if response.status_code == 201:
                invoice = response.json()
                return {
                    "success": True,
                    "message": f"Created custom invoice {invoice['invoice_id']} for {company['name']}",
                    "invoice": invoice,
                    "total": f"${invoice['total']:,.2f}",
                    "items": len(custom_items)
                }
                
        except Exception as e:
            logger.error(f"Error creating custom invoice: {e}")
            return {"error": str(e)}

# Example Minerva integration
class MinervaBillingAssistant:
    def __init__(self):
        self.commands = MinervaBillingCommands()
        self.command_patterns = {
            "create invoice": self._handle_create_invoice,
            "send invoice": self._handle_send_invoice,
            "record payment": self._handle_payment,
            "paid": self._handle_payment,
            "who owes": self._handle_outstanding,
            "unpaid": self._handle_outstanding,
            "billing history": self._handle_history,
            "custom invoice": self._handle_custom_invoice
        }

    def process_command(self, command: str) -> str:
        """Process natural language billing command"""
        command_lower = command.lower()
        
        # Find matching pattern
        for pattern, handler in self.command_patterns.items():
            if pattern in command_lower:
                return handler(command)
        
        return "I can help with:\n- Creating invoices\n- Sending invoices\n- Recording payments\n- Checking who owes money\n- Viewing billing history"

    def _handle_create_invoice(self, command: str) -> str:
        """Handle invoice creation commands"""
        # Extract company name and package
        # Example: "Create invoice for Bob's Plumbing for Growth package"
        
        # Simple parsing - in production use NLP
        parts = command.lower().split(" for ")
        if len(parts) >= 2:
            company_part = parts[1]
            
            # Extract package
            package = "starter"  # default
            if "growth" in command.lower():
                package = "growth"
            elif "professional" in command.lower():
                package = "professional"
            
            # Clean company name
            company_name = company_part.split(" for ")[0].strip()
            
            result = self.commands.create_invoice_for_company(company_name, package)
            
            if result.get("success"):
                return f"✅ {result['message']}\nTotal: {result['total']}\nDue: {result['due_date']}"
            else:
                return f"❌ {result.get('error', 'Failed to create invoice')}"
        
        return "Please specify: 'Create invoice for [Company Name] for [Package]'"

    def _handle_send_invoice(self, command: str) -> str:
        """Handle invoice sending commands"""
        # Extract company name
        parts = command.split(" to ")
        if len(parts) >= 2:
            company_name = parts[1].strip()
            result = self.commands.send_invoice_to_client(company_name)
            
            if result.get("success"):
                return f"✅ {result['message']}"
            else:
                return f"❌ {result.get('error', 'Failed to send invoice')}"
        
        return "Please specify: 'Send invoice to [Company Name]'"

    def _handle_payment(self, command: str) -> str:
        """Handle payment recording commands"""
        # Extract company and amount
        # Examples: 
        # "Bob's Plumbing paid"
        # "Record $2,497 payment from Bob's Plumbing"
        
        amount = None
        method = "bank_transfer"
        
        # Extract amount if specified
        if "$" in command:
            import re
            amounts = re.findall(r'\$[\d,]+(?:\.\d{2})?', command)
            if amounts:
                amount = float(amounts[0].replace('$', '').replace(',', ''))
        
        # Extract payment method
        if "stripe" in command.lower():
            method = "stripe"
        elif "paypal" in command.lower():
            method = "paypal"
        elif "check" in command.lower():
            method = "check"
        
        # Extract company name
        if " paid" in command.lower():
            company_name = command.lower().split(" paid")[0].strip()
        elif " from " in command.lower():
            company_name = command.lower().split(" from ")[-1].strip()
        else:
            return "Please specify the company name"
        
        result = self.commands.record_payment_from_company(company_name, amount, method)
        
        if result.get("success"):
            return f"✅ {result['message']}\n{result.get('receipt', '')}"
        else:
            return f"❌ {result.get('error', 'Failed to record payment')}"

    def _handle_outstanding(self, command: str) -> str:
        """Handle outstanding invoice queries"""
        result = self.commands.check_who_owes_money()
        
        if "error" in result:
            return f"❌ {result['error']}"
        
        if "message" in result:
            return result["message"]
        
        # Format outstanding invoices
        response = f"💰 Outstanding Invoices\n"
        response += f"Total: {result['total_outstanding']} ({result['count']} invoices)\n\n"
        
        for inv in result['invoices']:
            response += f"• {inv['company']}: {inv['amount_due']}"
            if inv['days_overdue'] > 0:
                response += f" (⚠️ {inv['days_overdue']} days overdue)"
            response += f"\n"
        
        return response

    def _handle_history(self, command: str) -> str:
        """Handle billing history queries"""
        # Extract company name
        parts = command.lower().split("history")
        if len(parts) >= 2 and " for " in parts[1]:
            company_name = parts[1].split(" for ")[-1].strip()
        else:
            # Try to extract from beginning
            company_name = command.split("'s")[0].strip() if "'s" in command else None
        
        if not company_name:
            return "Please specify: 'Show billing history for [Company Name]'"
        
        result = self.commands.get_company_billing_history(company_name)
        
        if "error" in result:
            return f"❌ {result['error']}"
        
        if "message" in result:
            return result["message"]
        
        # Format history
        response = f"📊 Billing History: {result['company']}\n"
        response += f"Total Billed: {result['total_billed']}\n"
        response += f"Total Paid: {result['total_paid']}\n"
        response += f"Balance: {result['balance']}\n\n"
        response += "Recent Invoices:\n"
        
        for inv in result['recent_invoices']:
            response += f"• {inv['date']} - {inv['invoice']} - {inv['amount']} ({inv['status']})\n"
        
        return response

    def _handle_custom_invoice(self, command: str) -> str:
        """Handle custom invoice creation"""
        # This would need more sophisticated parsing in production
        return "Custom invoice creation requires specific format:\n'Create custom invoice for [Company]: $X for [service], $Y for [service]'"

# Example usage
if __name__ == "__main__":
    assistant = MinervaBillingAssistant()
    
    # Test commands
    test_commands = [
        "Create invoice for Bob's Plumbing for Growth package",
        "Send invoice to Bob's Plumbing",
        "Bob's Plumbing paid",
        "Who owes money?",
        "Show billing history for Bob's Plumbing"
    ]
    
    for cmd in test_commands:
        print(f"\n> {cmd}")
        print(assistant.process_command(cmd))
        print("-" * 50) 