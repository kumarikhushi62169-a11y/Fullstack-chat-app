import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Settings,
  MessageCircle,
  Camera,
  X,
  Save,
} from "lucide-react";


export default function Navbar({ searchQuery = "", setSearchQuery, searchResults = [], onSearchResult }) {
const storedUser = JSON.parse(localStorage.getItem("user"));
const [user, setUser] = useState(storedUser);
const [showProfile, setShowProfile] = useState(false);
const [profileName, setProfileName] = useState(storedUser?.name || "");
const [profileFile, setProfileFile] = useState(null);
const [profilePreview, setProfilePreview] = useState(storedUser?.avatar || "");
const [profileError, setProfileError] = useState("");
const [isSavingProfile, setIsSavingProfile] = useState(false);

  const navigate = useNavigate();

const openProfile = () => {
  setProfileName(user?.name || "");
  setProfilePreview(user?.avatar || "");
  setProfileFile(null);
  setProfileError("");
  setShowProfile(true);
};

const saveProfile = async (event) => {
  event.preventDefault();
  if (!profileName.trim()) {
    setProfileError("Name is required.");
    return;
  }

  try {
    setIsSavingProfile(true);
    const formData = new FormData();
    formData.append("name", profileName.trim());
    if (profileFile) formData.append("avatar", profileFile);

    const response = await axios.put("http://localhost:5001/api/users/me", formData);
    const updatedUser = response.data.user;
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setShowProfile(false);
  } catch (error) {
    setProfileError(error.response?.data?.message || "Could not update profile.");
  } finally {
    setIsSavingProfile(false);
  }
};

const logoutUser = async () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user) {
      await axios.put(
        `http://localhost:5001/api/users/offline/${user.id}`
      );
    }

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    navigate("/");
  } catch (error) {
    console.log(error);
  }
};
  return (
    <nav className="h-[4.5rem] shrink-0 bg-[#0d1a2b] border-b border-slate-700/70 px-5 md:px-8 flex items-center justify-between gap-6 shadow-lg shadow-black/10">

      {/* Logo */}
      <div className="flex items-center gap-4">
      
        <div className="bg-emerald-500/15 border border-emerald-400/20 p-2.5 rounded-2xl">
          <MessageCircle size={22} className="text-white" />
        </div>

        <div>
          <h1 className="text-white text-lg md:text-xl font-bold tracking-tight">
            ChatSphere
          </h1>

          <p className="text-slate-500 text-xs hidden sm:block">
            Real Time Messaging Platform
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="hidden lg:flex relative items-center bg-[#17263b] border border-slate-700/60 px-4 py-2.5 rounded-2xl w-full max-w-md">
        <Search size={18} className="text-slate-400"  />

        <input
          type="text"     
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(event) => setSearchQuery?.(event.target.value)}
          className="bg-transparent text-white placeholder-slate-400 outline-none ml-2 w-full"
        />

        {searchResults.length > 0 && (
          <div className="absolute top-14 left-0 right-0 z-50 rounded-2xl border border-slate-700 bg-[#102139] p-2 shadow-2xl">
            {searchResults.map((result) => (
              <button
                type="button"
                key={result.id}
                onClick={() => onSearchResult?.(result)}
                className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-slate-800"
              >
                <p className="text-sm text-white truncate">{result.message}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {Number(result.sender_id) === Number(user?.id)
                    ? `To ${result.receiverName}`
                    : `From ${result.senderName}`}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">

        <button title="Notifications" className="text-slate-400 hover:text-emerald-300 transition">
          <Bell size={22} />
        </button>

        <button title="Edit profile" onClick={openProfile} className="text-slate-400 hover:text-emerald-300 transition">
          <Settings size={22} />
        </button>

        <div className="flex items-center gap-3">
       

          <button
            type="button"
            title="Edit profile"
            onClick={openProfile}
            className="w-10 h-10 rounded-2xl overflow-hidden bg-emerald-500/20 border border-emerald-400/25 flex items-center justify-center text-emerald-200 font-semibold"
          >
            {user?.avatar ? (
              <img src={`http://localhost:5001${user.avatar}`} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </button>

          <div className="hidden md:block">
           <h3 className="text-white font-semibold">
              {user?.name}
                 </h3>

            <p className="text-emerald-400 text-xs">
              <span className="mr-1">●</span> Online
            </p>

 

          </div>
           <div className="flex items-center gap-4">
  <button
    onClick={logoutUser}
    className="bg-rose-500/15 border border-rose-400/25 hover:bg-rose-500/25 text-rose-200 px-4 py-2 rounded-xl text-sm font-semibold transition"
  >
    Logout
  </button>
</div>
        </div>

      </div>

      {showProfile && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveProfile} className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#102139] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-emerald-300 text-xs uppercase tracking-[0.18em] font-semibold">Account</p>
                <h2 className="text-white text-2xl font-semibold mt-2">Edit profile</h2>
              </div>
              <button type="button" title="Close" onClick={() => setShowProfile(false)} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            <label className="text-sm text-slate-300 font-medium">Profile photo</label>
            <div className="mt-3 flex items-center gap-4">
              <div className="w-20 h-20 rounded-3xl overflow-hidden bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center text-emerald-200 text-2xl font-semibold">
                {profilePreview ? <img src={profilePreview.startsWith("blob:") ? profilePreview : `http://localhost:5001${profilePreview}`} alt="Preview" className="w-full h-full object-cover" /> : profileName.charAt(0).toUpperCase()}
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800">
                <Camera size={17} /> Change photo
                <input type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { setProfileFile(file); setProfilePreview(URL.createObjectURL(file)); } }} />
              </label>
            </div>

            <label htmlFor="profile-name" className="block text-sm text-slate-300 font-medium mt-6 mb-2">Display name</label>
            <input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-[#172b46] px-4 py-3.5 text-white outline-none focus:border-emerald-400/60" />

            {profileError && <p className="mt-3 text-sm text-rose-300">{profileError}</p>}

            <button type="submit" disabled={isSavingProfile} className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-semibold text-[#062016] hover:bg-emerald-400 disabled:opacity-60">
              <Save size={17} /> {isSavingProfile ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}