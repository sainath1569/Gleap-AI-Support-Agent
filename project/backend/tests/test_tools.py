import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import tools

def test_weather_valid_city():
    res = tools.get_weather("London")
    assert "temperature" in res or "error" in res

def test_weather_ssrf_attempt():
    malicious = "http://169.254.169.254/latest/meta-data/"
    res = tools.get_weather(malicious)
    assert "error" in res
    assert "invalid characters" in res["error"].lower()

def test_calculate_pricing_bounds():
    # Negative seats
    res_neg = tools.calculate_pricing("starter", team_members=-5)
    assert res_neg["team_seats"] == 1

    # Overly huge seats capped to 10000
    res_huge = tools.calculate_pricing("starter", team_members=999999)
    assert res_huge["team_seats"] == 10000

    # Annual discount
    res_ann = tools.calculate_pricing("growth", team_members=5, billing_cycle="annual")
    assert "savings" in res_ann

def test_customer_lookup_validation():
    # Valid customer
    res = tools.get_customer("john@example.com")
    assert res.get("name") == "John Doe"
    assert res.get("status") == "active"
    assert res.get("company") == "Acme Corp"

    # Invalid email syntax
    res_invalid = tools.get_customer("not-an-email")
    assert "error" in res_invalid

def test_order_status_validation():
    # Valid order
    res = tools.get_order_status("ORD-1001")
    assert res.get("status") == "Shipped"
    assert "tracking_number" in res

    # Bad format
    res_bad = tools.get_order_status("'; DROP TABLE orders; --")
    assert "error" in res_bad

def test_create_support_ticket():
    ticket = tools.create_support_ticket("customer@test.com", "App is not responding")
    assert ticket.get("status") == "open"
    assert "ticket_id" in ticket
    assert "TICKET-" in ticket["ticket_id"]
