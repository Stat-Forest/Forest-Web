function Video() {
  const videos = [
    {
      id: 1,
      title: "Tizim ichida hisobotlarni to'ldirish bo'yicha video qo'llanma",
      link: "https://drive.google.com/file/d/1lRFiggXSv3-p0lIfWAGQMplYuUQgZcpB/preview",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {videos.map((video) => (
        <div key={video.id} className="rounded-xl shadow p-4">
          <h3 className="text-lg font-semibold mb-3">{video.title}</h3>
          <div className="aspect-video">
            <iframe
              src={video.link}
              className="w-full h-full rounded-lg"
              allow="autoplay"
              allowFullScreen
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Video;
