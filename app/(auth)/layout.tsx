export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-center-col min-h-screen w-full">
      <div className="w-full max-w-screen-2xl mx-auto">
        {children}
      </div>
    </div>
  );
} 