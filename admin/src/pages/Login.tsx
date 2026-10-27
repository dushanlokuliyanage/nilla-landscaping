import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { login } from "@/lib/api";
import { loginSchema, validationMessage } from "@/lib/validation";
import Turnstile from "@/components/Turnstile";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setError(validationMessage(parsed.error));
      return;
    }
    if (!turnstileToken) { setError("Please complete the security check."); return; }
    setLoading(true);

    try {
      await login(parsed.data.email, parsed.data.password, turnstileToken);
      navigate("/");
    } catch {
      setError("Invalid email or password");
      setTurnstileToken("");
      setTurnstileKey((key) => key + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/images/sprout-logo.svg" alt="Nilla Garden" className="h-16 w-16" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-forest">Nilla</h1>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-forest/60">Landscaping &amp; Garden</p>
          <p className="mt-1 text-sm text-forest/60">Sign in to manage inquiries</p>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="  border border-forest/10 bg-white shadow-sm p-7"
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-forest">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full  border border-forest/15 bg-white px-4 py-2.5 text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-forest">Password</label>
            <input type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full  border border-forest/15 bg-white px-4 py-2.5 text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            />
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <div className="mb-5"><Turnstile key={turnstileKey} onToken={setTurnstileToken} /></div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2  bg-forest py-3 font-medium text-cream transition hover:bg-leaf disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
            <LogIn className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
