# Logical SQL schema

## Core tables

### cafes

- Primary key: id
- Required: name, slug, currency, timezone, status
- Unique: slug
- Important indexes: slug, status

### branches

- Primary key: id
- Foreign key: cafe_id -> cafes.id
- Required: cafe_id, name, timezone, status
- Important indexes: cafe_id

### floors

- Primary key: id
- Foreign key: branch_id -> branches.id
- Required: branch_id, name
- Important indexes: branch_id

### tables

- Primary key: id
- Foreign key: branch_id -> branches.id, floor_id -> floors.id nullable
- Required: branch_id, name, capacity, qr_token, status
- Unique: qr_token
- Important indexes: branch_id, floor_id, qr_token

### customers

- Primary key: id
- Required: name, phone, status
- Unique: phone per café or per business scope depending on tenant strategy
- Important indexes: phone, last_visit_at

### customer_sessions

- Primary key: id
- Foreign keys: cafe_id -> cafes.id, branch_id -> branches.id, table_id -> tables.id, customer_id -> customers.id nullable
- Required: cafe_id, branch_id, table_id, started_at, last_activity_at, status
- Unique: session_token or public session reference
- Important indexes: customer_id, table_id, status

### menu_categories

- Primary key: id
- Foreign key: cafe_id -> cafes.id
- Required: cafe_id, name, sort_order
- Important indexes: cafe_id, sort_order

### menu_items

- Primary key: id
- Foreign key: category_id -> menu_categories.id
- Required: category_id, name, price, currency, availability
- Important indexes: category_id, featured, availability

### modifiers

- Primary key: id
- Foreign key: menu_item_id -> menu_items.id
- Required: menu_item_id, name, required_flag, multi_select
- Important indexes: menu_item_id

### modifier_options

- Primary key: id
- Foreign key: modifier_id -> modifiers.id
- Required: modifier_id, label
- Important indexes: modifier_id

### orders

- Primary key: id
- Foreign keys: cafe_id -> cafes.id, branch_id -> branches.id, table_id -> tables.id, session_id -> customer_sessions.id, customer_id -> customers.id nullable
- Required: order_number, cafe_id, branch_id, table_id, session_id, status, subtotal, tax, total, currency
- Unique: order_number per café
- Important indexes: customer_id, session_id, status, created_at

### order_items

- Primary key: id
- Foreign key: order_id -> orders.id
- Required: order_id, menu_item_id, item_name_snapshot, unit_price, quantity, total
- Important indexes: order_id, menu_item_id

### order_item_modifiers

- Primary key: id
- Foreign key: order_item_id -> order_items.id, modifier_option_id -> modifier_options.id
- Required: order_item_id, modifier_option_id
- Important indexes: order_item_id, modifier_option_id

### payments

- Primary key: id
- Foreign key: order_id -> orders.id
- Required: order_id, amount, currency, status, method
- Important indexes: order_id, status

### favorites

- Primary key: id
- Foreign keys: customer_id -> customers.id, menu_item_id -> menu_items.id
- Required: customer_id, menu_item_id
- Unique: customer_id + menu_item_id
- Important indexes: customer_id

### campaigns

- Primary key: id
- Foreign key: cafe_id -> cafes.id
- Required: cafe_id, name, status
- Important indexes: cafe_id, status

### promotions

- Primary key: id
- Foreign key: cafe_id -> cafes.id
- Required: cafe_id, name, discount_type, value
- Important indexes: cafe_id, active_from, active_to

### occasions

- Primary key: id
- Foreign key: cafe_id -> cafes.id
- Required: cafe_id, name, season_tag, active_from, active_to
- Important indexes: cafe_id, occasion_date

### reviews

- Primary key: id
- Foreign keys: customer_id -> customers.id, order_id -> orders.id, cafe_id -> cafes.id, branch_id -> branches.id
- Required: customer_id, order_id, cafe_id, branch_id, rating, created_at
- Optional: visit_id (reference to the existing Visit context; nullable), comment
- Constraints: rating from 1 to 5, comment up to 1000 characters, unique order_id (one immutable feedback record per completed order)
- Important indexes: order_id unique, customer_id, visit_id

## Relationship summary

- Cafe -> Branch -> Floor -> Table
- Cafe -> MenuCategory -> MenuItem -> Modifier -> ModifierOption
- Customer -> CustomerSession
- Customer -> Order
- Order -> OrderItem -> OrderItemModifier
- Order -> Payment
- Customer -> Favorite -> MenuItem
