import login_video from "@/assets/video/auth_login.mp4";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function AuthVideo() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const videos = [
    {
      id: 1,
      title: "Tizimga kirish bo'yicha video qo'llanma",
      link: login_video,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <button
        type="button"
        onClick={() => navigate("/auth")}
        className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#00BC7D] dark:hover:text-[#00BC7D] text-sm font-semibold shadow-xs transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back") || "Orqaga"}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {videos.map((video) => (
        <div key={video.id} className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-md p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
          <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">{video.title}</h3>

          <div className="aspect-video">
            <video
              src={video.link}
              className="w-full h-full rounded-lg"
              controls
              preload="metadata"
            />
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

export default AuthVideo;
