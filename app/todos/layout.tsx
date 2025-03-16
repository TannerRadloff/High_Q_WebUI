import TodoNav from "@/components/features/todos/TodoNav";

export default function TodosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TodoNav />
      <main>{children}</main>
    </div>
  );
} 