import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
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
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          // Update username
          await supabase.from("profiles").update({ username }).eq("user_id", data.user.id);
        }
        toast({ title: "Account created!", description: "Welcome to Alley Cat." });
        navigate("/");
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
        <h1 className="font-pixel text-xl text-primary neon-text text-center mb-2 animate-flicker">
          ALLEY CAT
        </h1>
        <p className="font-pixel text-[8px] text-secondary text-center mb-8 orange-text">
          {isLogin ? "WELCOME BACK" : "JOIN THE LEAGUE"}
        </p>

        <form onSubmit={handleSubmit} className="border-2 border-primary bg-card p-4 space-y-4">
          {!isLogin && (
            <div>
              <label className="font-pixel text-[8px] text-primary block mb-1">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none"
                required={!isLogin}
                minLength={3}
                maxLength={20}
              />
            </div>
          )}
          <div>
            <label className="font-pixel text-[8px] text-primary block mb-1">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none"
              required
            />
          </div>
          <div>
            <label className="font-pixel text-[8px] text-primary block mb-1">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-primary bg-primary text-primary-foreground py-2 font-pixel text-[9px] hover:neon-border transition-all disabled:opacity-50"
          >
            {loading ? "LOADING..." : isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-center mt-4 font-pixel text-[8px] text-muted-foreground hover:text-primary transition-colors"
        >
          {isLogin ? "NEED AN ACCOUNT? SIGN UP" : "ALREADY HAVE AN ACCOUNT? SIGN IN"}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
