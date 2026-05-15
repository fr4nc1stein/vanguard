import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-sm font-bold text-blue-700">Vanguard VDP</p>
          <p className="text-xs text-gray-500">Vulnerability Disclosure Program</p>
        </div>
        <SignUp />
      </div>
    </main>
  );
}
