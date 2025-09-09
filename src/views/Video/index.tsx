function Video() {
  const videos = [
    {
      id: 1,
      title: "Tizimga kirish bo'yicha video qo'llanma",
      link: "https://www.youtube.com/embed/EoGz_S5ZPuQ",
    },
    {
      id: 2,
      title: "Rejalarni to'ldirish bo'yicha video qo'llanma",
      link: "https://www.youtube.com/embed/2qqtf_FLNHw",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {videos.map((video) => (
        <div key={video.id} className="rounded-xl shadow p-4">
          <h3 className="text-lg font-semibold mb-2">{video.title}</h3>
          <iframe
            width="100%"
            height="300"
            src={video.link}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      ))}
    </div>
  );
}

export default Video;
