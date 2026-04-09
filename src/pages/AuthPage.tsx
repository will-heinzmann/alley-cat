import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Error", description: String(result.error), variant: "destructive" });
      }
      if (result.redirected) return;
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (signupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl text-primary mb-2">🎳 ALLEY CAT</h1>
          <div className="border border-border bg-card p-6 space-y-3">
            <p className="text-lg text-primary">📧 Check Your Email!</p>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to <span className="text-foreground font-bold">{email}</span>.
            </p>
            <p className="text-xs text-muted-foreground">
              Click the link in the email to verify your account, then come back and sign in.
            </p>
          </div>
          <p className="mt-4">
            <button onClick={() => { setSignupComplete(false); setIsLogin(true); }} className="text-primary text-xs hover:underline">
              ← Back to Sign In
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <Helmet>
      <title>{isLogin ? "Sign In" : "Create Account"} — Alley Cat Bowling Tracker</title>
      <meta name="description" content="Sign in or create a free Alley Cat account to track your bowling scores, find alleys, and compete on the leaderboard." />
      <link rel="canonical" href="https://alleycat-bowling.com/auth" />
    </Helmet>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl text-primary text-center mb-1">🎳 ALLEY CAT</h1>
        <p className="text-sm text-secondary text-center mb-6">
          {isLogin ? "Welcome Back" : "Join the League"}
        </p>

        <div className="space-y-2 mb-4">
          <button
            onClick={() => handleSocialLogin("google")}
            disabled={loading}
            className="w-full border border-border bg-card text-foreground py-2 text-sm hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <button
            onClick={() => handleSocialLogin("apple")}
            disabled={loading}
            className="w-full border border-border bg-card text-foreground py-2 text-sm hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

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
    </>
  );
};

export default AuthPage;
