export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-md px-4 py-8 sm:px-0">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold">NextJS AI Chatbot</h1>
          <p className="text-sm text-muted-foreground mt-1">Secure authentication with Supabase</p>
        </div>
        {children}
      </div>
    </div>
  );
} 