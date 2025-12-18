import { useEffect, useState, type ReactNode } from "react";

const SnowAnimation = () => {
  const [snowflakes, setSnowflakes] = useState<ReactNode[]>([]);

  useEffect(() => {
    // 25 ta mayda qorflak yaratamiz - asta sekin yogib turishi uchun
    const flakes: ReactNode[] = [];
    const snowflakeSymbols = ["❄", "❅", "❆", "•"];
    
    for (let i = 0; i < 25; i++) {
      flakes.push(
        <div
          key={i}
          className="snowflake"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${12 + Math.random() * 8}s`, // 12-20 sekund - asta sekin
            animationDelay: `${Math.random() * 5}s`,
            fontSize: `${0.4 + Math.random() * 0.6}em`, // Mayda qorflaklar
            opacity: 0.6 + Math.random() * 0.4, // Shaffof
          }}
        >
          {snowflakeSymbols[Math.floor(Math.random() * snowflakeSymbols.length)]}
        </div>
      );
    }
    setSnowflakes(flakes);
  }, []);

  return <div className="snow-container">{snowflakes}</div>;
};

export default SnowAnimation;

