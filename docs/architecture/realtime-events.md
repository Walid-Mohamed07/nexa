# Real-time event contract

The event contract is technology-independent and must remain stable across implementation choices.

## Event names

- ORDER_CREATED
- ORDER_CONFIRMED
- ORDER_PREPARING
- ORDER_READY
- ORDER_SERVED
- ORDER_COMPLETED
- ORDER_CANCELLED

## Event payload structure

{
"event": "ORDER_PREPARING",
"timestamp": "2026-09-08T10:30:00Z",
"cafeId": "cafe_nexa",
"branchId": "branch_1",
"tableId": "table_12",
"orderId": "order_1004",
"sessionId": "session_guest_1",
"customerId": null,
"status": "PREPARING"
}

## Contract requirements

- Event names are shared across web, backend, and desktop apps
- Status changes must be consistent with the shared order lifecycle
- The payload must remain small and deterministic
- The actual transport mechanism can differ later
