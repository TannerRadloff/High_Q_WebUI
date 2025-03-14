export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center">
      <div className="w-full max-w-screen-2xl mx-auto">
        {children}
      </div>
    </div>
  );
} 