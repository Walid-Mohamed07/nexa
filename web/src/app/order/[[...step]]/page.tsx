import { OrderFlow } from "@/components/order/order-flow";

export default function OrderPage({ params }: { params: { step?: string[] } }) {
  return <OrderFlow step={params.step?.[0] || "cart"} />;
}
