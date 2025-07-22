#!/usr/bin/env python3
"""
Minerva Outreach Assistant for Pleasant Cove Design
Direct integration with existing lead system - Path A: Start Simple
"""

import os
import json
import requests
import sqlite3
import logging
from datetime import datetime
from typing import Dict, List, Optional
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MinervaOutreachAssistant:
    """
    Minerva AI assistant for Pleasant Cove lead outreach
    Integrates directly with your existing TypeScript backend
    """
    
    def __init__(self, backend_url="http://localhost:5173"):
        self.backend_url = backend_url
        self.admin_token = "pleasantcove2024admin"  # Your existing admin token
        
        # Minerva's personality and context
        self.minerva_context = {
            "role": "Personal Assistant for Pleasant Cove Design",
            "business_context": {
                "company": "Pleasant Cove Design",
                "services": ["Website Design", "Local SEO", "Mobile-Friendly Sites"],
                "target_market": "Small businesses without websites",
                "location": "Maine",
                "pricing": "Affordable monthly plans, no huge upfront costs"
            },
            "goals": [
                "Help Ben grow Pleasant Cove Design",
                "Automate lead outreach and follow-ups",
                "Schedule discovery calls with qualified prospects",
                "Track and improve outreach performance"
            ]
        }
        
        logger.info("🤖 Minerva Outreach Assistant initialized")
    
    def analyze_leads(self, segment="high_priority") -> Dict:
        """Get leads that need Minerva's attention"""
        try:
            # Get leads from your existing backend
            url = f"{self.backend_url}/api/businesses?token={self.admin_token}"
            response = requests.get(url)
            
            if response.status_code != 200:
                return {"error": "Could not fetch leads", "leads": []}
            
            all_leads = response.json()
            
            # Filter based on segment
            filtered_leads = []
            
            if segment == "high_priority":
                # High-score leads not yet contacted
                filtered_leads = [
                    lead for lead in all_leads 
                    if (lead.get('score', 0) >= 80 and lead.get('stage') in ['scraped', 'not_contacted'])
                ]
            elif segment == "need_follow_up":
                # Contacted leads that haven't responded
                filtered_leads = [
                    lead for lead in all_leads 
                    if lead.get('stage') == 'contacted'
                ]
            elif segment == "schedule_ready":
                # Responded leads ready for appointment scheduling
                filtered_leads = [
                    lead for lead in all_leads 
                    if lead.get('stage') == 'responded'
                ]
            
            return {
                "segment": segment,
                "total_count": len(filtered_leads),
                "leads": filtered_leads[:10],  # Return top 10
                "analysis": self._analyze_lead_quality(filtered_leads)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing leads: {e}")
            return {"error": str(e), "leads": []}
    
    def _analyze_lead_quality(self, leads: List[Dict]) -> Dict:
        """Analyze lead quality for Minerva's decision making"""
        if not leads:
            return {"message": "No leads to analyze"}
        
        total_leads = len(leads)
        avg_score = sum(lead.get('score', 0) for lead in leads) / total_leads
        
        business_types = {}
        for lead in leads:
            btype = lead.get('businessType', 'unknown')
            business_types[btype] = business_types.get(btype, 0) + 1
        
        return {
            "total_leads": total_leads,
            "average_score": round(avg_score, 1),
            "top_business_types": sorted(business_types.items(), key=lambda x: x[1], reverse=True)[:3],
            "has_contact_info": sum(1 for lead in leads if lead.get('phone') or lead.get('email')),
            "recommendation": self._get_outreach_recommendation(leads)
        }
    
    def _get_outreach_recommendation(self, leads: List[Dict]) -> str:
        """Get Minerva's recommendation for outreach strategy"""
        if not leads:
            return "No leads require immediate attention."
        
        high_score_count = sum(1 for lead in leads if lead.get('score', 0) >= 80)
        has_phone_count = sum(1 for lead in leads if lead.get('phone'))
        
        if high_score_count >= 5:
            return f"🚨 URGENT: {high_score_count} high-quality leads ready for immediate outreach!"
        elif has_phone_count >= 3:
            return f"📞 Good opportunity: {has_phone_count} leads with phone numbers ready for SMS campaign."
        else:
            return "📧 Consider email outreach or lead enrichment to improve contact rates."
    
    def launch_outreach_campaign(self, campaign_config: Dict) -> Dict:
        """Launch an outreach campaign through your existing system"""
        try:
            campaign_type = campaign_config.get('type', 'sms')
            target_leads = campaign_config.get('lead_ids', [])
            custom_message = campaign_config.get('message')
            
            logger.info(f"🚀 Minerva launching {campaign_type} campaign for {len(target_leads)} leads")
            
            results = {
                "campaign_type": campaign_type,
                "started_at": datetime.now().isoformat(),
                "target_count": len(target_leads),
                "sent": 0,
                "failed": 0,
                "results": []
            }
            
            # Launch outreach for each lead
            for lead_id in target_leads:
                try:
                    # Use your existing outreach endpoint
                    url = f"{self.backend_url}/api/bot/outreach/{lead_id}"
                    response = requests.post(url)
                    
                    if response.status_code == 200:
                        result = response.json()
                        results["sent"] += 1
                        results["results"].append({
                            "lead_id": lead_id,
                            "status": "sent",
                            "details": result
                        })
                        logger.info(f"✅ Outreach sent to lead {lead_id}")
                    else:
                        results["failed"] += 1
                        results["results"].append({
                            "lead_id": lead_id,
                            "status": "failed",
                            "error": f"HTTP {response.status_code}"
                        })
                        logger.warning(f"❌ Failed to send outreach to lead {lead_id}")
                    
                    # Respectful delay between sends
                    time.sleep(1)
                    
                except Exception as e:
                    results["failed"] += 1
                    results["results"].append({
                        "lead_id": lead_id,
                        "status": "error",
                        "error": str(e)
                    })
                    logger.error(f"Error sending to lead {lead_id}: {e}")
            
            results["completed_at"] = datetime.now().isoformat()
            results["success_rate"] = f"{results['sent']}/{results['target_count']}"
            
            return results
            
        except Exception as e:
            logger.error(f"Campaign launch error: {e}")
            return {"error": str(e), "sent": 0, "failed": len(target_leads)}
    
    def schedule_follow_ups(self, days_ahead=3) -> Dict:
        """Schedule follow-up reminders for contacted leads"""
        try:
            # Get leads that need follow-up
            leads_analysis = self.analyze_leads("need_follow_up")
            leads = leads_analysis.get("leads", [])
            
            scheduled_count = 0
            follow_ups = []
            
            for lead in leads:
                # Calculate follow-up date
                follow_up_date = datetime.now()
                follow_up_date = follow_up_date.replace(
                    day=follow_up_date.day + days_ahead
                ).isoformat()
                
                follow_ups.append({
                    "lead_id": lead.get("id"),
                    "business_name": lead.get("name"),
                    "follow_up_date": follow_up_date,
                    "action": "send_follow_up_message",
                    "reason": "No response to initial outreach"
                })
                scheduled_count += 1
            
            return {
                "scheduled_count": scheduled_count,
                "follow_ups": follow_ups,
                "next_action_date": follow_up_date
            }
            
        except Exception as e:
            logger.error(f"Error scheduling follow-ups: {e}")
            return {"error": str(e), "scheduled_count": 0}
    
    def generate_performance_report(self) -> Dict:
        """Generate outreach performance report"""
        try:
            # Get current stats from your backend
            url = f"{self.backend_url}/api/stats?token={self.admin_token}"
            response = requests.get(url)
            
            if response.status_code != 200:
                return {"error": "Could not fetch stats"}
            
            stats = response.json()
            
            # Enhanced analysis
            report = {
                "timestamp": datetime.now().isoformat(),
                "overview": {
                    "total_leads": stats.get("totalLeads", 0),
                    "conversion_rate": stats.get("conversionRate", 0),
                    "revenue": {
                        "total": stats.get("totalRevenue", 0),
                        "paid": stats.get("paidRevenue", 0),
                        "pending": stats.get("pendingRevenue", 0)
                    }
                },
                "lead_pipeline": stats.get("stageStats", {}),
                "minerva_insights": self._generate_insights(stats),
                "recommended_actions": self._get_action_recommendations(stats)
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return {"error": str(e)}
    
    def _generate_insights(self, stats: Dict) -> List[str]:
        """Generate Minerva's insights from the data"""
        insights = []
        
        stage_stats = stats.get("stageStats", {})
        conversion_rate = float(stats.get("conversionRate", 0))
        
        # Pipeline insights
        scraped = stage_stats.get("scraped", 0)
        contacted = stage_stats.get("contacted", 0)
        responded = stage_stats.get("responded", 0)
        
        if scraped > contacted * 2:
            insights.append(f"📊 Pipeline bottleneck: {scraped} scraped leads but only {contacted} contacted. Need more outreach!")
        
        if contacted > responded * 3:
            insights.append(f"📧 Message optimization needed: {contacted} contacted but only {responded} responded. Consider A/B testing messages.")
        
        if conversion_rate < 5:
            insights.append(f"🎯 Low conversion rate ({conversion_rate}%). Focus on higher-quality leads or improve follow-up strategy.")
        elif conversion_rate > 15:
            insights.append(f"🚀 Excellent conversion rate ({conversion_rate}%)! Current strategy is working well.")
        
        return insights
    
    def _get_action_recommendations(self, stats: Dict) -> List[Dict]:
        """Get specific action recommendations"""
        recommendations = []
        
        stage_stats = stats.get("stageStats", {})
        scraped = stage_stats.get("scraped", 0)
        contacted = stage_stats.get("contacted", 0)
        
        if scraped >= 10:
            recommendations.append({
                "action": "launch_outreach_campaign",
                "priority": "high",
                "description": f"Launch outreach to {scraped} new leads",
                "estimated_impact": "Could generate 2-5 new conversations"
            })
        
        if contacted >= 5:
            recommendations.append({
                "action": "schedule_follow_ups",
                "priority": "medium", 
                "description": f"Schedule follow-ups for {contacted} contacted leads",
                "estimated_impact": "Improve response rates by 20-30%"
            })
        
        return recommendations

# CLI Interface for easy testing
if __name__ == "__main__":
    import sys
    
    minerva = MinervaOutreachAssistant()
    
    if len(sys.argv) < 2:
        print("🤖 Minerva Outreach Assistant")
        print("Usage:")
        print("  python minerva_outreach_assistant.py analyze [segment]")
        print("  python minerva_outreach_assistant.py campaign [lead_ids]")
        print("  python minerva_outreach_assistant.py follow_ups")
        print("  python minerva_outreach_assistant.py report")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "analyze":
        segment = sys.argv[2] if len(sys.argv) > 2 else "high_priority"
        result = minerva.analyze_leads(segment)
        print(json.dumps(result, indent=2))
    
    elif command == "campaign":
        lead_ids = sys.argv[2:] if len(sys.argv) > 2 else []
        lead_ids = [int(id) for id in lead_ids]
        
        campaign_config = {
            "type": "sms",
            "lead_ids": lead_ids
        }
        result = minerva.launch_outreach_campaign(campaign_config)
        print(json.dumps(result, indent=2))
    
    elif command == "follow_ups":
        result = minerva.schedule_follow_ups()
        print(json.dumps(result, indent=2))
    
    elif command == "report":
        result = minerva.generate_performance_report()
        print(json.dumps(result, indent=2))
    
    else:
        print(f"Unknown command: {command}") 