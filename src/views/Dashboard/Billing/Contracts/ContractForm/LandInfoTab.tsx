// 3-tab: Yer haqida ma'lumot (billing InfoAboutLandForm.vue porti) + BoundaryMap.
import { useMemo, type Dispatch } from "react";
import { useTranslation } from "react-i18next";
import { formatAreaGa, getPolygonLocations } from "@/features/billing/contractPolygons";
import { formatCoord } from "@/features/billing/format";
import BoundaryMap from "./BoundaryMap";
import { Field, SectionCard, SectionErrors, TextInput } from "./fields";
import type { FormAction, LandInfoSection } from "./formState";

interface LandInfoTabProps {
  landInfo: LandInfoSection;
  dispatch: Dispatch<FormAction>;
  errorOf: (key: string) => string | undefined;
  sectionErrors?: string[];
  contractId?: string | null;
  readOnly?: boolean;
}

function LandInfoTab({ landInfo, dispatch, errorOf, sectionErrors, contractId, readOnly }: LandInfoTabProps) {
  const { t } = useTranslation();
  const set = (field: keyof LandInfoSection) => (value: string) => dispatch({ type: "landInfo", field, value });

  const polygonLocations = useMemo(() => getPolygonLocations(landInfo.boundary_geojson), [landInfo.boundary_geojson]);
  const multi = polygonLocations.length > 1;

  const numberField = (field: "circle" | "section" | "counter" | "massive", labelKey: string) => (
    <Field label={t(labelKey)} htmlFor={`cf-${field}`} error={errorOf(`landInfo.${field}`)}>
      <TextInput
        id={`cf-${field}`}
        value={landInfo[field]}
        onChange={set(field)}
        invalid={!!errorOf(`landInfo.${field}`)}
        maxLength={50}
        disabled={readOnly}
      />
    </Field>
  );

  return (
    <div className="space-y-5">
      <SectionErrors messages={sectionErrors} />
      <SectionCard>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {numberField("circle", "billing.form_circle")}
          {numberField("section", "billing.form_section")}
          {numberField("counter", "billing.form_counter")}
          {numberField("massive", "billing.form_massive")}
          <Field label={t("billing.form_rent_area")} htmlFor="cf-rent-area" required error={errorOf("landInfo.rent_area")}>
            <TextInput
              id="cf-rent-area"
              value={landInfo.rent_area}
              onChange={set("rent_area")}
              decimal
              invalid={!!errorOf("landInfo.rent_area")}
              disabled={readOnly}
            />
          </Field>
          <Field
            label={t("billing.form_cadastral_number")}
            htmlFor="cf-cadastral"
            error={errorOf("landInfo.cadastral_number")}
            className="lg:col-span-3"
          >
            <TextInput
              id="cf-cadastral"
              value={landInfo.cadastral_number}
              onChange={set("cadastral_number")}
              placeholder={t("billing.form_cadastral_ph")}
              invalid={!!errorOf("landInfo.cadastral_number")}
              maxLength={100}
              disabled={readOnly}
            />
          </Field>
          <Field
            label={`${t("billing.form_latitude")}${multi ? ` ${t("billing.form_first_polygon")}` : ""}`}
            htmlFor="cf-lat"
            error={errorOf("landInfo.latitude")}
            className="lg:col-span-2"
          >
            <TextInput
              id="cf-lat"
              value={landInfo.latitude}
              onChange={set("latitude")}
              decimal
              placeholder="41.311081"
              readOnly={multi}
              invalid={!!errorOf("landInfo.latitude")}
              disabled={readOnly}
            />
          </Field>
          <Field
            label={`${t("billing.form_longitude")}${multi ? ` ${t("billing.form_first_polygon")}` : ""}`}
            htmlFor="cf-lng"
            error={errorOf("landInfo.longitude")}
            className="lg:col-span-2"
          >
            <TextInput
              id="cf-lng"
              value={landInfo.longitude}
              onChange={set("longitude")}
              decimal
              placeholder="69.240562"
              readOnly={multi}
              invalid={!!errorOf("landInfo.longitude")}
              disabled={readOnly}
            />
          </Field>
        </div>

        {multi && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              {t("billing.form_polygons_title", { count: polygonLocations.length })}
            </p>
            <table className="w-full min-w-[480px] text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="px-2 py-1.5">{t("billing.form_polygon")}</th>
                  <th className="px-2 py-1.5">{t("billing.form_latitude")}</th>
                  <th className="px-2 py-1.5">{t("billing.form_longitude")}</th>
                  <th className="px-2 py-1.5">{t("billing.form_polygon_area")}</th>
                </tr>
              </thead>
              <tbody>
                {polygonLocations.map((loc) => (
                  <tr key={loc.index} className="border-t border-slate-100 dark:border-slate-800 tabular-nums">
                    <td className="px-2 py-1.5 font-semibold">{loc.index}</td>
                    <td className="px-2 py-1.5">{formatCoord(loc.lat)}</td>
                    <td className="px-2 py-1.5">{formatCoord(loc.lng)}</td>
                    <td className="px-2 py-1.5">{formatAreaGa(loc.areaGa)} ga</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <BoundaryMap
          latitude={landInfo.latitude}
          longitude={landInfo.longitude}
          boundaryGeojson={landInfo.boundary_geojson}
          contractId={contractId}
          readOnly={readOnly}
          onLatLngChange={(lat, lng) =>
            dispatch({
              type: "landInfo_patch",
              patch: { latitude: lat === null ? "" : String(lat), longitude: lng === null ? "" : String(lng) },
            })
          }
          onBoundaryChange={(geojson) => dispatch({ type: "landInfo_patch", patch: { boundary_geojson: geojson } })}
        />
      </SectionCard>
    </div>
  );
}

export default LandInfoTab;
