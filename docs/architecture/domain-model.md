# Domain model

## Shared entities

### Café

- id
- name
- slug
- logo
- description
- currency
- timezone
- status
- createdAt
- updatedAt

### Branch

- id
- cafeId
- name
- address
- phone
- timezone
- status

### Floor

- id
- branchId
- name
- status

### Table

- id
- branchId
- floorId nullable
- name
- capacity
- status
- qrToken
- createdAt
- updatedAt

### CustomerSession

- id
- cafeId
- branchId
- tableId
- customerId nullable
- startedAt
- lastActivityAt
- status
- sessionToken

### Customer

- id
- name
- phone
- createdAt
- updatedAt
- lastVisitAt
- status

### MenuCategory

- id
- cafeId
- name
- sortOrder

### MenuItem

- id
- categoryId
- name
- description
- image
- price
- currency
- availability
- featured
- sortOrder
- createdAt
- updatedAt

### Modifier

- id
- menuItemId
- name
- required
- multiSelect

### ModifierOption

- id
- modifierId
- label
- priceDelta
- defaultSelected

### Order

- id
- orderNumber
- cafeId
- branchId
- tableId
- sessionId
- customerId nullable
- status
- subtotal
- discounts
- tax
- total
- currency
- notes
- createdAt
- updatedAt

### OrderItem

- id
- orderId
- menuItemId
- itemNameSnapshot
- unitPrice
- quantity
- total
- modifiers
- notes

### Payment

- id
- orderId
- amount
- currency
- status
- method
- provider
- providerReference
- createdAt
- updatedAt

## Shared enums

### OrderStatus

PENDING, CONFIRMED, PREPARING, READY, SERVED, COMPLETED, CANCELLED

### PaymentStatus

PENDING, PAID, FAILED, REFUNDED

### PaymentMethod

CASH, CARD, DIGITAL_WALLET, OTHER

### AvailabilityStatus

AVAILABLE, UNAVAILABLE, HIDDEN

### SessionStatus

ACTIVE, EXPIRED, CLOSED
