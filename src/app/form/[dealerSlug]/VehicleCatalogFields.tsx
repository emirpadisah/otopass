"use client";

import { useEffect, useState } from "react";
import { Field, Input } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CatalogOption = { id: number; name: string };
type CatalogMode = "loading" | "ready" | "manual";

const MANUAL_CHOICE = "__manual__";
const fallbackCategories = ["Otomobil", "Arazi, SUV & Pickup", "Minivan & Panelvan"];

export function VehicleCatalogFields({ localMode }: { localMode: boolean }) {
  const [catalogMode, setCatalogMode] = useState<CatalogMode>(localMode ? "manual" : "loading");
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [models, setModels] = useState<CatalogOption[]>([]);
  const [motors, setMotors] = useState<CatalogOption[]>([]);
  const [packages, setPackages] = useState<CatalogOption[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [modelName, setModelName] = useState("");
  const [motorName, setMotorName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [manualBrand, setManualBrand] = useState(false);
  const [manualModel, setManualModel] = useState(false);
  const [manualMotor, setManualMotor] = useState(false);
  const [manualPackage, setManualPackage] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingMotors, setLoadingMotors] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const categoryId = categories.find((option) => option.name === categoryName)?.id;
  const brandId = !manualBrand ? brands.find((option) => option.name === brandName)?.id : undefined;
  const modelId = !manualModel ? models.find((option) => option.name === modelName)?.id : undefined;
  const motorId = !manualMotor ? motors.find((option) => option.name === motorName)?.id : undefined;
  const useManualBrand = catalogMode === "manual" || manualBrand;
  const useManualModel = useManualBrand || manualModel;
  const useManualMotor = useManualModel || manualMotor;
  const useManualPackage = useManualMotor || manualPackage;

  useEffect(() => {
    if (localMode) return;
    let active = true;
    async function loadCategories() {
      try {
        const { data, error } = await getSupabaseBrowserClient()
          .from("vehicle_catalog_categories").select("id,name").order("name");
        if (error || !data?.length) throw error || new Error("Empty catalog");
        if (active) {
          setCategories(data);
          setCatalogMode("ready");
        }
      } catch {
        if (active) setCatalogMode("manual");
      }
    }
    void loadCategories();
    return () => { active = false; };
  }, [localMode]);

  useEffect(() => {
    const selectedCategoryId = categoryId;
    if (catalogMode !== "ready" || !selectedCategoryId || manualBrand) return;
    let active = true;
    async function loadBrands(parentId: number) {
      setLoadingBrands(true);
      try {
        const { data, error } = await getSupabaseBrowserClient()
          .from("vehicle_catalog_brands").select("id,name").eq("category_id", parentId).order("name");
        if (error || !data?.length) throw error || new Error("Empty brands");
        if (active) setBrands(data);
      } catch {
        if (active) setManualBrand(true);
      } finally {
        if (active) setLoadingBrands(false);
      }
    }
    void loadBrands(selectedCategoryId);
    return () => { active = false; };
  }, [catalogMode, categoryId, manualBrand]);

  useEffect(() => {
    const selectedBrandId = brandId;
    if (catalogMode !== "ready" || !selectedBrandId || manualModel) return;
    let active = true;
    async function loadModels(parentId: number) {
      setLoadingModels(true);
      try {
        const { data, error } = await getSupabaseBrowserClient()
          .from("vehicle_catalog_models").select("id,name").eq("brand_id", parentId).order("name");
        if (error || !data?.length) throw error || new Error("Empty models");
        if (active) setModels(data);
      } catch {
        if (active) setManualModel(true);
      } finally {
        if (active) setLoadingModels(false);
      }
    }
    void loadModels(selectedBrandId);
    return () => { active = false; };
  }, [catalogMode, brandId, manualModel]);

  useEffect(() => {
    const selectedModelId = modelId;
    if (catalogMode !== "ready" || !selectedModelId || manualMotor) return;
    let active = true;
    async function loadMotors(parentId: number) {
      setLoadingMotors(true);
      try {
        const { data, error } = await getSupabaseBrowserClient()
          .from("vehicle_catalog_motor_options").select("id,name").eq("model_id", parentId).order("name");
        if (error) throw error;
        if (active) {
          setMotors(data || []);
          if (!data?.length) setManualMotor(true);
        }
      } catch {
        if (active) setManualMotor(true);
      } finally {
        if (active) setLoadingMotors(false);
      }
    }
    void loadMotors(selectedModelId);
    return () => { active = false; };
  }, [catalogMode, modelId, manualMotor]);

  useEffect(() => {
    const selectedMotorId = motorId;
    if (catalogMode !== "ready" || !selectedMotorId || manualPackage) return;
    let active = true;
    async function loadPackages(parentId: number) {
      setLoadingPackages(true);
      try {
        const { data, error } = await getSupabaseBrowserClient()
          .from("vehicle_catalog_packages").select("id,name").eq("motor_option_id", parentId).order("name");
        if (error) throw error;
        if (active) {
          setPackages(data || []);
          if (!data?.length) setManualPackage(true);
        }
      } catch {
        if (active) setManualPackage(true);
      } finally {
        if (active) setLoadingPackages(false);
      }
    }
    void loadPackages(selectedMotorId);
    return () => { active = false; };
  }, [catalogMode, motorId, manualPackage]);

  function chooseCategory(value: string) {
    setCategoryName(value);
    setBrandName(""); setModelName(""); setMotorName(""); setPackageName("");
    setBrands([]); setModels([]); setMotors([]); setPackages([]);
    setManualBrand(false); setManualModel(false); setManualMotor(false); setManualPackage(false);
  }

  function chooseBrand(value: string) {
    setBrandName(value === MANUAL_CHOICE ? "" : value);
    setManualBrand(value === MANUAL_CHOICE);
    setModelName(""); setMotorName(""); setPackageName("");
    setModels([]); setMotors([]); setPackages([]);
    setManualModel(value === MANUAL_CHOICE); setManualMotor(value === MANUAL_CHOICE); setManualPackage(value === MANUAL_CHOICE);
  }

  function chooseModel(value: string) {
    setModelName(value === MANUAL_CHOICE ? "" : value);
    setManualModel(value === MANUAL_CHOICE);
    setMotorName(""); setPackageName("");
    setMotors([]); setPackages([]);
    setManualMotor(value === MANUAL_CHOICE); setManualPackage(value === MANUAL_CHOICE);
  }

  function chooseMotor(value: string) {
    setMotorName(value === MANUAL_CHOICE ? "" : value);
    setManualMotor(value === MANUAL_CHOICE);
    setPackageName(""); setPackages([]);
    setManualPackage(value === MANUAL_CHOICE);
  }

  return (
    <>
      <Field label="Araç türü *" labelFor="vehicle_category">
        <select id="vehicle_category" name="vehicle_category" className="input-base" value={categoryName} onChange={(event) => chooseCategory(event.target.value)} required>
          <option value="">{catalogMode === "loading" ? "Araç türleri yükleniyor..." : "Araç türünü seçin"}</option>
          {(catalogMode === "ready" ? categories.map(({ name }) => name) : fallbackCategories).map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </Field>

      <Field label="Marka *" labelFor="brand" description={catalogMode === "manual" ? "Araç listesi kullanılamıyor; markayı elle yazın." : undefined}>
        {useManualBrand ? (
          <>
            <Input id="brand" name="brand" value={brandName} onChange={(event) => setBrandName(event.target.value)} maxLength={80} placeholder="Örn. Volkswagen" required />
            {catalogMode === "ready" && brands.length > 0 ? <button type="button" className="intake-catalog-switch" onClick={() => chooseBrand("")}>Listeden seç</button> : null}
          </>
        ) : (
          <select id="brand" name="brand" className="input-base" value={brandName} onChange={(event) => chooseBrand(event.target.value)} required>
            <option value="">{!categoryId ? "Önce araç türünü seçin" : loadingBrands ? "Markalar yükleniyor..." : "Marka seçin"}</option>
            {brands.map(({ id, name }) => <option key={id} value={name}>{name}</option>)}
            {categoryId ? <option value={MANUAL_CHOICE}>Listede yok, elle yaz</option> : null}
          </select>
        )}
      </Field>

      <Field label="Model *" labelFor="model">
        {useManualModel ? (
          <>
            <Input id="model" name="model" value={modelName} onChange={(event) => setModelName(event.target.value)} maxLength={80} placeholder="Örn. Golf" required />
            {!useManualBrand && models.length > 0 ? <button type="button" className="intake-catalog-switch" onClick={() => chooseModel("")}>Listeden seç</button> : null}
          </>
        ) : (
          <select id="model" name="model" className="input-base" value={modelName} onChange={(event) => chooseModel(event.target.value)} required>
            <option value="">{!brandId ? "Önce marka seçin" : loadingModels ? "Modeller yükleniyor..." : "Model seçin"}</option>
            {models.map(({ id, name }) => <option key={id} value={name}>{name}</option>)}
            {brandId ? <option value={MANUAL_CHOICE}>Listede yok, elle yaz</option> : null}
          </select>
        )}
      </Field>

      <Field label="Motor" labelFor="engine_info" description="Sitedeki model alt seçeneği; elektrikli araçlarda donanım adı olabilir.">
        {useManualMotor ? (
          <>
            <Input id="engine_info" name="engine_info" value={motorName} onChange={(event) => setMotorName(event.target.value)} maxLength={120} placeholder="Örn. 1.6 TDI" />
            {!useManualModel && motors.length > 0 ? <button type="button" className="intake-catalog-switch" onClick={() => chooseMotor("")}>Listeden seç</button> : null}
          </>
        ) : (
          <select id="engine_info" name="engine_info" className="input-base" value={motorName} onChange={(event) => chooseMotor(event.target.value)}>
            <option value="">{!modelId ? "Önce model seçin" : loadingMotors ? "Motorlar yükleniyor..." : "Motor seçin"}</option>
            {motors.map(({ id, name }) => <option key={id} value={name}>{name}</option>)}
            {modelId ? <option value={MANUAL_CHOICE}>Listede yok, elle yaz</option> : null}
          </select>
        )}
      </Field>

      <Field label="Paket" labelFor="vehicle_package">
        {useManualPackage ? (
          <>
            <Input id="vehicle_package" name="vehicle_package" value={packageName} onChange={(event) => setPackageName(event.target.value)} maxLength={100} placeholder="Örn. Comfortline" />
            {!useManualMotor && packages.length > 0 ? <button type="button" className="intake-catalog-switch" onClick={() => { setManualPackage(false); setPackageName(""); }}>Listeden seç</button> : null}
          </>
        ) : (
          <select id="vehicle_package" name="vehicle_package" className="input-base" value={packageName} onChange={(event) => {
            if (event.target.value === MANUAL_CHOICE) { setManualPackage(true); setPackageName(""); }
            else setPackageName(event.target.value);
          }}>
            <option value="">{!motorId ? "Önce motor seçin" : loadingPackages ? "Paketler yükleniyor..." : "Paket seçin"}</option>
            {packages.map(({ id, name }) => <option key={id} value={name}>{name}</option>)}
            {motorId ? <option value={MANUAL_CHOICE}>Listede yok, elle yaz</option> : null}
          </select>
        )}
      </Field>
    </>
  );
}
