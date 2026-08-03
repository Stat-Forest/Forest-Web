import { useTranslation } from "react-i18next";

function SupportInformation() {
  const { t, i18n } = useTranslation();
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
        Support Chat
      </h2>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        {i18n.language === "ru"
          ? "Кнопка чата отображается в правом нижнем углу страницы."
          : "Chat tugmasi sahifaning past-o'ng burchagida ko'rinadi."}
      </p>
    </div>
  );
}

export default SupportInformation;
