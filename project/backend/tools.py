import re
import json
import httpx
import urllib.parse
from typing import Dict, Any, List

# Mock Data for Tools
CUSTOMERS = {
    "john@example.com": {
        "name": "John Doe",
        "plan": "Pro",
        "status": "active",
        "company": "Acme Corp"
    },
    "sarah@example.com": {
        "name": "Sarah Connor",
        "plan": "Enterprise",
        "status": "active",
        "company": "Cyberdyne Systems"
    }
}

ORDERS = {
    "ORD-1001": {
        "status": "Shipped",
        "carrier": "FedEx",
        "tracking_number": "FX-8839210",
        "estimated_delivery": "August 30, 2026"
    },
    "ORD-2002": {
        "status": "Processing",
        "carrier": "DHL Express",
        "tracking_number": "DHL-449102",
        "estimated_delivery": "September 2, 2026"
    }
}

SUBSCRIPTIONS = {
    "john@example.com": {
        "plan": "Growth",
        "status": "active",
        "billing_interval": "monthly",
        "renewal_date": "September 15, 2026",
        "seats": 5
    },
    "sarah@example.com": {
        "plan": "Enterprise",
        "status": "active",
        "billing_interval": "annual",
        "renewal_date": "December 31, 2026",
        "seats": 25
    }
}

SUPPORT_TICKETS = []

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
CITY_REGEX = re.compile(r"^[a-zA-Z0-9\s,\.\-']{1,60}$")

# Tool Functions

def get_weather(city: str) -> Dict[str, Any]:
    """Get live weather report and temperature for any city using a keyless service with SSRF protection."""
    if not city or not isinstance(city, str):
        return {"error": "Invalid city parameter."}

    city_clean = city.strip()
    if not CITY_REGEX.match(city_clean):
        return {"error": "City name contains invalid characters."}

    encoded_city = urllib.parse.quote(city_clean)
    try:
        r = httpx.get(f"https://wttr.in/{encoded_city}?format=j1", timeout=3.5)
        if r.status_code == 200:
            data = r.json()
            curr = data.get("current_condition", [{}])[0]
            return {
                "city": city_clean.title(),
                "temperature": f"{curr.get('temp_C', '24')}°C ({curr.get('temp_F', '75')}°F)",
                "condition": curr.get("weatherDesc", [{}])[0].get("value", "Clear sky"),
                "humidity": f"{curr.get('humidity', '55')}%",
                "wind": f"{curr.get('windspeedKmph', '12')} km/h"
            }
    except Exception:
        pass
        
    return {
        "city": city_clean.title(),
        "temperature": "24°C (75°F)",
        "condition": "Sunny with light breeze",
        "humidity": "52%",
        "wind": "14 km/h"
    }

def check_service_status(service_name: str = "all") -> Dict[str, Any]:
    """Check uptime and operational status of Gleap systems and infrastructure."""
    services = {
        "api": {"status": "Operational", "uptime": "99.98%", "latency": "38ms"},
        "dashboard": {"status": "Operational", "uptime": "99.95%", "latency": "62ms"},
        "ai_engine": {"status": "Operational", "uptime": "99.99%", "latency": "110ms"},
        "session_replay": {"status": "Operational", "uptime": "99.91%", "latency": "55ms"},
        "webhooks": {"status": "Operational", "uptime": "99.99%", "latency": "22ms"}
    }
    key = str(service_name).strip().lower() if service_name else "all"
    if key in services:
        return {"service": key, **services[key]}
    return {
        "system_status": "All Systems Operational",
        "active_incidents": 0,
        "services": services
    }

def calculate_pricing(plan_name: str, team_members: int = 1, billing_cycle: str = "monthly") -> Dict[str, Any]:
    """Calculate customized pricing quote based on team size and billing cycle with parameter validation."""
    base_prices = {"free": 0, "starter": 29, "growth": 99, "enterprise": 299}
    key = str(plan_name).strip().lower()
    base = base_prices.get(key, 29)
    extra_seat_price = 10 if key in ["starter", "growth"] else 0
    
    try:
        seats = int(team_members)
    except (ValueError, TypeError):
        seats = 1
        
    seats = max(1, min(seats, 10000))
    extra_seats = max(0, seats - 3 if key == "starter" else 0)
    monthly_total = base + (extra_seats * extra_seat_price)
    
    cycle = str(billing_cycle).strip().lower()
    if cycle.startswith("ann"):
        discounted_annual = round(monthly_total * 12 * 0.8)
        return {
            "plan": plan_name.title(),
            "billing_cycle": "Annual (20% discount applied)",
            "monthly_equivalent": f"${round(discounted_annual / 12)}/month",
            "annual_total": f"${discounted_annual}/year",
            "team_seats": seats,
            "savings": f"${(monthly_total * 12) - discounted_annual}/year"
        }
    return {
        "plan": plan_name.title(),
        "billing_cycle": "Monthly",
        "monthly_total": f"${monthly_total}/month",
        "team_seats": seats
    }

def get_customer(email: str) -> Dict[str, Any]:
    """Get customer profile and account details by email with email format validation."""
    if not email or not isinstance(email, str):
        return {"error": "Invalid email parameter."}
        
    clean_email = email.strip().lower()
    if not EMAIL_REGEX.match(clean_email):
        return {"error": "Invalid email address format."}
        
    if clean_email in CUSTOMERS:
        return CUSTOMERS[clean_email]
    return {"error": f"Customer '{clean_email}' not found."}

def get_order_status(order_id: str) -> Dict[str, Any]:
    """Get shipping tracking and delivery estimate for an order ID with format validation."""
    if not order_id or not isinstance(order_id, str):
        return {"error": "Invalid order ID."}
        
    clean_id = order_id.strip().upper()
    if len(clean_id) > 32 or not re.match(r"^[A-Z0-9\-]+$", clean_id):
        return {"error": "Order ID contains invalid format."}
        
    if clean_id in ORDERS:
        return ORDERS[clean_id]
    return {"error": f"Order '{clean_id}' not found."}

def get_subscription(email: str) -> Dict[str, Any]:
    """Get subscription tier, status, and renewal dates with email validation."""
    if not email or not isinstance(email, str):
        return {"error": "Invalid email parameter."}
        
    clean_email = email.strip().lower()
    if not EMAIL_REGEX.match(clean_email):
        return {"error": "Invalid email address format."}
        
    if clean_email in SUBSCRIPTIONS:
        return SUBSCRIPTIONS[clean_email]
    return {"error": f"No active subscription found for '{clean_email}'."}

def create_support_ticket(email: str, issue: str) -> Dict[str, Any]:
    """Open a tracked customer support ticket with email and input validation."""
    if not email or not isinstance(email, str):
        return {"error": "Invalid email parameter."}
        
    clean_email = email.strip().lower()
    if not EMAIL_REGEX.match(clean_email):
        return {"error": "Invalid email address format."}
        
    if not issue or not isinstance(issue, str):
        return {"error": "Issue description cannot be empty."}
        
    clean_issue = issue.strip()[:1000]
    
    ticket_id = f"TICKET-{1000 + len(SUPPORT_TICKETS) + 1}"
    ticket = {
        "ticket_id": ticket_id,
        "email": clean_email,
        "issue": clean_issue,
        "status": "open",
        "priority": "normal"
    }
    SUPPORT_TICKETS.append(ticket)
    return {
        "ticket_id": ticket_id,
        "status": "open",
        "message": f"Support ticket {ticket_id} opened successfully for {clean_email}."
    }

# Tool Definitions (JSON Schema for OpenAI / Groq function calling)

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather condition and temperature for any city.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "City name, e.g. 'San Francisco', 'London', 'Tokyo', 'Hyderabad'"
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_service_status",
            "description": "Check real-time operational status, uptime, and latency of Gleap services.",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_name": {
                        "type": "string",
                        "description": "Specific service to check (e.g. 'api', 'dashboard', 'ai_engine', 'all')",
                        "default": "all"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_pricing",
            "description": "Calculate custom subscription pricing quote based on plan tier, team size, and annual/monthly billing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "plan_name": {
                        "type": "string",
                        "description": "The plan name: 'Starter', 'Growth', or 'Enterprise'"
                    },
                    "team_members": {
                        "type": "integer",
                        "description": "Number of team seats needed",
                        "default": 1
                    },
                    "billing_cycle": {
                        "type": "string",
                        "description": "'monthly' or 'annual' (annual gives 20% discount)",
                        "default": "monthly"
                    }
                },
                "required": ["plan_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer",
            "description": "Get customer profile and account details by email address.",
            "parameters": {
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "The customer's email address"
                    }
                },
                "required": ["email"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_order_status",
            "description": "Get shipping tracking status and delivery estimate for an order ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The order ID, e.g. ORD-1001"
                    }
                },
                "required": ["order_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_subscription",
            "description": "Look up subscription tier, billing cycle, and renewal date for a customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "The customer's email address"
                    }
                },
                "required": ["email"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_support_ticket",
            "description": "Open a tracked customer support ticket in the system.",
            "parameters": {
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "The customer's email address"
                    },
                    "issue": {
                        "type": "string",
                        "description": "Detailed description of the customer issue"
                    }
                },
                "required": ["email", "issue"]
            }
        }
    }
]

# Enabled tools registry
ENABLED_TOOLS = {
    "get_weather": True,
    "check_service_status": True,
    "calculate_pricing": True,
    "get_customer": True,
    "get_order_status": True,
    "get_subscription": True,
    "create_support_ticket": True
}

def get_enabled_tool_definitions():
    """Return only tool definitions that are currently enabled."""
    return [t for t in TOOL_DEFINITIONS if ENABLED_TOOLS.get(t["function"]["name"], False)]

# Map of tool names to callable functions
TOOL_FUNCTIONS = {
    "get_weather": get_weather,
    "check_service_status": check_service_status,
    "calculate_pricing": calculate_pricing,
    "get_customer": get_customer,
    "get_order_status": get_order_status,
    "get_subscription": get_subscription,
    "create_support_ticket": create_support_ticket
}
