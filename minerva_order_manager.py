"""
Minerva Order Manager - Tracks customer orders before billing
Integrates with Pleasant Cove UI and billing engine
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import sqlite3
from dataclasses import dataclass, asdict
import requests

logger = logging.getLogger(__name__)

# Service catalog with prices
SERVICES_CATALOG = {
    "packages": {
        "starter": {
            "name": "Starter Package",
            "price": 997,
            "includes": [
                "Single-page professional website",
                "Mobile-responsive design",
                "Contact form with email notifications",
                "Basic SEO setup",
                "Google Analytics integration",
                "SSL security certificate",
                "1 round of revisions"
            ]
        },
        "growth": {
            "name": "Growth Package", 
            "price": 2497,
            "includes": [
                "Up to 5-page custom website",
                "All Starter features",
                "Blog/News section",
                "Social media integration",
                "Advanced SEO optimization",
                "Google My Business setup",
                "Image gallery",
                "2 rounds of revisions"
            ]
        },
        "professional": {
            "name": "Professional Package",
            "price": 4997,
            "includes": [
                "Up to 10-page premium website",
                "All Growth features",
                "Appointment booking system",
                "Customer portal/login area",
                "Email marketing integration",
                "Advanced analytics dashboard",
                "Priority support",
                "3 rounds of revisions"
            ]
        }
    },
    "addons": {
        # Core Website Features
        "additional_page": {"name": "Additional page", "price": 297},
        "contact_forms": {"name": "Custom contact forms", "price": 197},
        "photo_gallery": {"name": "Photo galleries", "price": 297},
        "video_integration": {"name": "Video integration", "price": 397},
        
        # Business Tools
        "appointment_booking": {"name": "Appointment booking system", "price": 797},
        "messaging_portal": {"name": "Customer messaging portal", "price": 997},
        "quote_forms": {"name": "Quote request forms", "price": 497},
        "live_chat": {"name": "Live chat integration", "price": 497},
        
        # Marketing & SEO
        "seo_package": {"name": "SEO optimization package", "price": 797},
        "google_business": {"name": "Google My Business setup", "price": 297},
        "social_integration": {"name": "Social media integration", "price": 397},
        "email_marketing": {"name": "Email marketing setup", "price": 597},
        
        # Content & Design
        "copywriting": {"name": "Professional copywriting (per page)", "price": 397},
        "logo_design": {"name": "Logo design", "price": 797},
        "custom_graphics": {"name": "Custom graphics (per set)", "price": 497},
        
        # Technical
        "ssl_setup": {"name": "SSL certificate setup", "price": 197},
        "performance_opt": {"name": "Performance optimization", "price": 597},
        "security_hardening": {"name": "Security hardening", "price": 597}
    }
}

@dataclass
class Order:
    id: str
    company_id: str
    company_name: str
    status: str
    package: Optional[str] = None
    addons: List[str] = None
    custom_items: List[Dict] = None
    subtotal: float = 0
    tax: float = 0
    total: float = 0
    notes: Optional[str] = None
    created_at: str = None
    updated_at: str = None

class OrderManager:
    def __init__(self, db_path="orders.db", pleasant_cove_api="http://localhost:3000/api"):
        self.db_path = db_path
        self.pleasant_cove_api = pleasant_cove_api
        self.init_database()
        logger.info("📦 Order Manager initialized")

    def init_database(self):
        """Initialize orders database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                company_name TEXT NOT NULL,
                status TEXT NOT NULL,
                package TEXT,
                addons TEXT,
                custom_items TEXT,
                subtotal REAL NOT NULL,
                tax REAL NOT NULL,
                total REAL NOT NULL,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()

    def create_order(self, company_id: str, initial_package: str = None) -> Order:
        """Create a new order for a company"""
        # Fetch company info
        try:
            response = requests.get(f"{self.pleasant_cove_api}/companies/{company_id}")
            company = response.json()
        except:
            company = {"name": "Unknown Company"}
        
        order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{company_id[:8]}"
        
        order = Order(
            id=order_id,
            company_id=company_id,
            company_name=company.get("name", "Unknown"),
            status="draft",
            package=initial_package,
            addons=[],
            custom_items=[],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        if initial_package:
            self._calculate_totals(order)
        
        self._save_order(order)
        logger.info(f"📋 Created order {order_id} for {company.get('name')}")
        
        return order

    def add_package_to_order(self, order_id: str, package: str) -> Order:
        """Add or change package selection"""
        order = self.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        if package not in SERVICES_CATALOG["packages"]:
            raise ValueError(f"Invalid package: {package}")
        
        order.package = package
        self._calculate_totals(order)
        self._save_order(order)
        
        logger.info(f"📦 Added {package} package to order {order_id}")
        return order

    def add_addon_to_order(self, order_id: str, addon_key: str, quantity: int = 1) -> Order:
        """Add addon service to order"""
        order = self.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        if addon_key not in SERVICES_CATALOG["addons"]:
            raise ValueError(f"Invalid addon: {addon_key}")
        
        # Add to addons list (handle multiple quantities)
        for _ in range(quantity):
            order.addons.append(addon_key)
        
        self._calculate_totals(order)
        self._save_order(order)
        
        addon_name = SERVICES_CATALOG["addons"][addon_key]["name"]
        logger.info(f"➕ Added {quantity}x {addon_name} to order {order_id}")
        return order

    def add_custom_item_to_order(self, order_id: str, description: str, price: float) -> Order:
        """Add custom line item to order"""
        order = self.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        custom_item = {
            "description": description,
            "price": price,
            "added_at": datetime.now().isoformat()
        }
        
        order.custom_items.append(custom_item)
        self._calculate_totals(order)
        self._save_order(order)
        
        logger.info(f"✏️ Added custom item '{description}' (${price}) to order {order_id}")
        return order

    def remove_from_order(self, order_id: str, item_type: str, item_id: str) -> Order:
        """Remove item from order"""
        order = self.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        if item_type == "package":
            order.package = None
        elif item_type == "addon":
            if item_id in order.addons:
                order.addons.remove(item_id)
        elif item_type == "custom":
            # Remove by index
            try:
                idx = int(item_id)
                if 0 <= idx < len(order.custom_items):
                    order.custom_items.pop(idx)
            except:
                pass
        
        self._calculate_totals(order)
        self._save_order(order)
        
        logger.info(f"➖ Removed {item_type} from order {order_id}")
        return order

    def _calculate_totals(self, order: Order):
        """Calculate order totals"""
        subtotal = 0
        
        # Package price
        if order.package and order.package in SERVICES_CATALOG["packages"]:
            subtotal += SERVICES_CATALOG["packages"][order.package]["price"]
        
        # Addon prices
        for addon in order.addons:
            if addon in SERVICES_CATALOG["addons"]:
                subtotal += SERVICES_CATALOG["addons"][addon]["price"]
        
        # Custom items
        for item in order.custom_items:
            subtotal += item.get("price", 0)
        
        # Calculate tax (adjust rate as needed)
        tax_rate = 0.0  # No tax for services in most states
        tax = subtotal * tax_rate
        
        order.subtotal = subtotal
        order.tax = tax
        order.total = subtotal + tax

    def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            order = Order(
                id=row['id'],
                company_id=row['company_id'],
                company_name=row['company_name'],
                status=row['status'],
                package=row['package'],
                addons=json.loads(row['addons']) if row['addons'] else [],
                custom_items=json.loads(row['custom_items']) if row['custom_items'] else [],
                subtotal=row['subtotal'],
                tax=row['tax'],
                total=row['total'],
                notes=row['notes'],
                created_at=row['created_at'],
                updated_at=row['updated_at']
            )
            return order
        return None

    def get_company_orders(self, company_id: str) -> List[Order]:
        """Get all orders for a company"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM orders WHERE company_id = ? ORDER BY created_at DESC",
            (company_id,)
        )
        rows = cursor.fetchall()
        conn.close()
        
        orders = []
        for row in rows:
            orders.append(Order(
                id=row['id'],
                company_id=row['company_id'],
                company_name=row['company_name'],
                status=row['status'],
                package=row['package'],
                addons=json.loads(row['addons']) if row['addons'] else [],
                custom_items=json.loads(row['custom_items']) if row['custom_items'] else [],
                subtotal=row['subtotal'],
                tax=row['tax'],
                total=row['total'],
                notes=row['notes'],
                created_at=row['created_at'],
                updated_at=row['updated_at']
            ))
        
        return orders

    def _save_order(self, order: Order):
        """Save order to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO orders (
                id, company_id, company_name, status, package,
                addons, custom_items, subtotal, tax, total,
                notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            order.id, order.company_id, order.company_name, order.status,
            order.package, json.dumps(order.addons), json.dumps(order.custom_items),
            order.subtotal, order.tax, order.total, order.notes,
            order.created_at, datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()

    def update_order_status(self, order_id: str, status: str) -> Order:
        """Update order status"""
        order = self.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        order.status = status
        self._save_order(order)
        
        logger.info(f"📝 Updated order {order_id} status to {status}")
        return order

    def get_order_summary(self, order_id: str) -> Dict:
        """Get formatted order summary for display"""
        order = self.get_order(order_id)
        if not order:
            return {"error": "Order not found"}
        
        summary = {
            "order_id": order.id,
            "company": order.company_name,
            "status": order.status,
            "items": [],
            "subtotal": order.subtotal,
            "tax": order.tax,
            "total": order.total,
            "created": order.created_at,
            "updated": order.updated_at
        }
        
        # Add package
        if order.package:
            package_info = SERVICES_CATALOG["packages"][order.package]
            summary["items"].append({
                "type": "package",
                "name": package_info["name"],
                "price": package_info["price"],
                "includes": package_info["includes"]
            })
        
        # Add addons
        addon_counts = {}
        for addon in order.addons:
            addon_counts[addon] = addon_counts.get(addon, 0) + 1
        
        for addon, count in addon_counts.items():
            addon_info = SERVICES_CATALOG["addons"][addon]
            summary["items"].append({
                "type": "addon",
                "name": addon_info["name"],
                "quantity": count,
                "unit_price": addon_info["price"],
                "total": addon_info["price"] * count
            })
        
        # Add custom items
        for idx, item in enumerate(order.custom_items):
            summary["items"].append({
                "type": "custom",
                "id": idx,
                "name": item["description"],
                "price": item["price"]
            })
        
        return summary

    def convert_to_invoice(self, order_id: str) -> Dict:
        """Convert order to invoice format for billing engine"""
        order = self.get_order(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Build line items for invoice
        line_items = []
        
        # Package
        if order.package:
            package_info = SERVICES_CATALOG["packages"][order.package]
            line_items.append({
                "description": package_info["name"],
                "quantity": 1,
                "unit_price": package_info["price"],
                "total": package_info["price"]
            })
        
        # Addons
        addon_counts = {}
        for addon in order.addons:
            addon_counts[addon] = addon_counts.get(addon, 0) + 1
        
        for addon, count in addon_counts.items():
            addon_info = SERVICES_CATALOG["addons"][addon]
            line_items.append({
                "description": addon_info["name"],
                "quantity": count,
                "unit_price": addon_info["price"],
                "total": addon_info["price"] * count
            })
        
        # Custom items
        for item in order.custom_items:
            line_items.append({
                "description": item["description"],
                "quantity": 1,
                "unit_price": item["price"],
                "total": item["price"]
            })
        
        return {
            "company_id": order.company_id,
            "order_id": order.id,
            "line_items": line_items,
            "subtotal": order.subtotal,
            "tax": order.tax,
            "total": order.total,
            "notes": order.notes
        }

# Minerva commands for natural language order management
class MinervaOrderCommands:
    def __init__(self):
        self.order_manager = OrderManager()
        logger.info("🤖 Minerva Order Commands initialized")

    def create_order_for_company(self, company_name: str, package: str = None) -> str:
        """Natural language: 'Start an order for Bob's Plumbing with Growth package'"""
        # Find company
        # In production, this would search the Pleasant Cove API
        # For now, we'll use a placeholder company_id
        company_id = f"comp_{company_name.lower().replace(' ', '_')}"
        
        order = self.order_manager.create_order(company_id, package)
        
        response = f"✅ Created order {order.id} for {company_name}"
        if package:
            response += f" with {package.title()} package (${SERVICES_CATALOG['packages'][package]['price']})"
        
        return response

    def add_to_order(self, order_ref: str, item: str) -> str:
        """Natural language: 'Add SEO package to Bob's order'"""
        # Find order (by company name or order ID)
        # This is simplified - in production would be smarter
        
        # Check if it's an addon
        for addon_key, addon_info in SERVICES_CATALOG["addons"].items():
            if item.lower() in addon_info["name"].lower():
                # Find the order
                # For demo, using a simple approach
                orders = self.order_manager.get_company_orders(f"comp_{order_ref.lower().replace(' ', '_')}")
                if orders:
                    order = orders[0]  # Most recent
                    updated = self.order_manager.add_addon_to_order(order.id, addon_key)
                    return f"✅ Added {addon_info['name']} to order\nNew total: ${updated.total:,.2f}"
        
        return "❌ Could not find that service. Try: 'Add SEO package' or 'Add logo design'"

    def show_order(self, company_ref: str) -> str:
        """Natural language: 'Show Bob's Plumbing order'"""
        # Find company's orders
        company_id = f"comp_{company_ref.lower().replace(' ', '_')}"
        orders = self.order_manager.get_company_orders(company_id)
        
        if not orders:
            return f"No orders found for {company_ref}"
        
        order = orders[0]  # Most recent
        summary = self.order_manager.get_order_summary(order.id)
        
        response = f"📋 Order {order.id} for {order.company_name}\n"
        response += f"Status: {order.status}\n\n"
        
        for item in summary["items"]:
            if item["type"] == "package":
                response += f"📦 {item['name']} - ${item['price']:,.2f}\n"
            elif item["type"] == "addon":
                response += f"➕ {item['name']}"
                if item["quantity"] > 1:
                    response += f" x{item['quantity']}"
                response += f" - ${item['total']:,.2f}\n"
            else:
                response += f"✏️ {item['name']} - ${item['price']:,.2f}\n"
        
        response += f"\n💰 Total: ${summary['total']:,.2f}"
        
        return response

    def finalize_order(self, company_ref: str) -> str:
        """Natural language: 'Finalize Bob's order and create invoice'"""
        company_id = f"comp_{company_ref.lower().replace(' ', '_')}"
        orders = self.order_manager.get_company_orders(company_id)
        
        if not orders:
            return f"No orders found for {company_ref}"
        
        order = orders[0]
        
        # Update status
        self.order_manager.update_order_status(order.id, "sent")
        
        # Get invoice data
        invoice_data = self.order_manager.convert_to_invoice(order.id)
        
        return f"""✅ Order finalized and ready for invoicing
Order ID: {order.id}
Total: ${invoice_data['total']:,.2f}

Next: Create invoice with billing engine"""

# Example usage
if __name__ == "__main__":
    commands = MinervaOrderCommands()
    
    # Test flow
    print(commands.create_order_for_company("Bob's Plumbing", "growth"))
    print(commands.add_to_order("Bob's Plumbing", "SEO package"))
    print(commands.add_to_order("Bob's Plumbing", "logo design"))
    print(commands.show_order("Bob's Plumbing"))
    print(commands.finalize_order("Bob's Plumbing")) 