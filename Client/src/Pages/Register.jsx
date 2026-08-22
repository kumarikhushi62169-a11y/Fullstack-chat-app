import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { useToast } from "../components/useToast";

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const registerUser = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.name || !form.email || !form.password) {
      setErrorMessage("Complete all fields to create your account.");
      return;
    }

    if (form.password.length < 6) {
      setErrorMessage("Your password must be at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await axios.post(
        "http://localhost:5001/api/auth/register",
        form,
      );
      setSuccessMessage(response.data.message || "Account created successfully.");
      showToast("Account created. You can login now.", "success");
      setTimeout(() => navigate("/"), 700);
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed. Please try again.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-700/70 bg-[#0d1a2b] shadow-2xl shadow-black/30">
        <form
          onSubmit={registerUser}
          className="w-full p-7 sm:p-10 md:p-12 flex flex-col justify-center"
        >
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="p-2.5 rounded-xl bg-emerald-400/15 border border-emerald-300/20">
              <MessageCircle className="text-emerald-300" size={21} />
            </div>
            <span className="font-semibold tracking-tight">ChatSphere</span>
          </div>

          <p className="text-emerald-300 text-xs uppercase tracking-[0.2em] font-semibold">
            Get started
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3">
            Create your account
          </h1>
          <p className="text-slate-400 text-sm mt-3 leading-6">
            Join your conversations in a private, real-time workspace.
          </p>

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </div>
          )}

          <label className="text-sm text-slate-300 font-medium mt-8 mb-2" htmlFor="register-name">
            Full name
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#17263b] px-4 focus-within:border-emerald-400/60 focus-within:ring-2 focus-within:ring-emerald-400/10">
            <UserRound size={18} className="text-slate-500" />
            <input
              id="register-name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              value={form.name}
              className="w-full bg-transparent py-3.5 text-white placeholder-slate-500 outline-none"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>

          <label className="text-sm text-slate-300 font-medium mt-5 mb-2" htmlFor="register-email">
            Email address
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#17263b] px-4 focus-within:border-emerald-400/60 focus-within:ring-2 focus-within:ring-emerald-400/10">
            <Mail size={18} className="text-slate-500" />
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              className="w-full bg-transparent py-3.5 text-white placeholder-slate-500 outline-none"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>

          <label className="text-sm text-slate-300 font-medium mt-5 mb-2" htmlFor="register-password">
            Password
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#17263b] px-4 focus-within:border-emerald-400/60 focus-within:ring-2 focus-within:ring-emerald-400/10">
            <LockKeyhole size={18} className="text-slate-500" />
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              value={form.password}
              className="w-full bg-transparent py-3.5 text-white placeholder-slate-500 outline-none"
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <button
              type="button"
              title={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-500 hover:text-slate-200"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-7 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-[#062016] font-semibold py-3.5 rounded-xl transition"
          >
            {isSubmitting ? "Registering..." : "Register"}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>

          <p className="text-slate-400 text-sm mt-7 text-center">
            Already have an account?
            <Link
              to="/"
              className="text-emerald-300 hover:text-emerald-200 font-medium ml-1"
            >
              Login
            </Link>
          </p>
        </form>

      </div>
    </main>
  );
}
