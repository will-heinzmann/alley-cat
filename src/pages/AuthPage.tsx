import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });
        if (error) throw error;
        setSignupComplete(true);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl text-primary text-center mb-1">🎳 ALLEY CAT</h1>
        <p className="text-sm text-secondary text-center mb-6">
          {isLogin ? "Welcome Back" : "Join the League"}
        </p>

        <form onSubmit={handleSubmit} className="border border-border bg-card p-4 space-y-3">
          {!isLogin && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Username:</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none"
                required={!isLogin} minLength={3} maxLength={20} />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Email:</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Password:</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" required minLength={6} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full border border-border bg-primary text-primary-foreground py-1.5 text-sm hover:opacity-80 disabled:opacity-50">
            {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-center mt-4">
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary text-xs hover:underline">
            {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
