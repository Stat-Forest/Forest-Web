import login_video from "@/assets/video/report_create.mp4";

function Video() {
  const videos = [
    {
      id: 1,
      title: "Tizim ichida hisobotlar bilan ishlash bo'yicha video qo'llanma",
      link: login_video,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {videos.map((video) => (
        <div key={video.id} className="rounded-xl border shadow p-4 bg-white">
          <h3 className="text-lg font-semibold mb-3">{video.title}</h3>

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
  );
}

export default Video;
