import { redirect } from "next/navigation";

export default function TransactionsPage() {
  redirect("/pages?tab=transactions");
}
