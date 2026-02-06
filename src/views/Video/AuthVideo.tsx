function AuthVideo() {
  const videos = [
    {
      id: 1,
      title: "Tizimga kirish bo'yicha video qo'llanma",
      link: "https://drive.google.com/file/d/1QEOocGmnE2Dultee6QZkp2JQ_838ZTQr/preview",
    },
    {
      id: 2,
      title:
        "Tizimga kirishda elektron imzodan foydalanish bo'yicha video qo'llanma",
      link: "https://drive.google.com/file/d/1oZWfiTpEBAMAYWI0ZZaAl7azwLFkSlNK/preview",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {videos.map((video) => (
        <div key={video.id} className="rounded-xl border shadow p-4 bg-white">
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

export default AuthVideo;
