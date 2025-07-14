import { useEffect, useState } from "react";

const messages = [
  "Tizim hozirda test rejimida",
  "Система сейчас в тестовом режиме",
];

const TestModeCarousel = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 3000); // Har 3 soniyada almashtirish

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-yellow-100 text-yellow-900 text-center py-2 font-medium shadow">
      {messages[index]}
    </div>
  );
};

export default TestModeCarousel;
