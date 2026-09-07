import { beforeEach, expect, it, vi } from "vitest";
import type { LocalData } from "../src/lib/local/store";
const m = vi.hoisted(()=>({read:vi.fn(),mutate:vi.fn(),dealer:vi.fn(),app:vi.fn(),offers:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/data-mode",()=>({isLocalDataMode:()=>true}));
vi.mock("@/lib/local/store",()=>({readLocalData:m.read,mutateLocalData:m.mutate}));
vi.mock("@/lib/supabase/queries",()=>({getDealerForCurrentUser:m.dealer,getDealerApplicationForCurrentUser:m.app,listDealerOffersForApplicationCurrentUser:m.offers}));
import {createOfferLink,readPublicOffer,respondPublicOffer,similarApplications} from "../src/lib/offer-links";
let data: LocalData;
beforeEach(()=>{
 vi.clearAllMocks();
 data = {dealers:[{id:"d",name:"Galeri",is_active:true}],applications:[{id:"a",dealer_id:"d",brand:"Toyota",model:"Corolla",owner_phone:"+905550000000",status:"offered",submitted_at:"2026-01-01",created_at:"2026-01-01",owner_name:"PRIVATE"}],offers:[{id:"o",application_id:"a",status:"pending",amount:100,currency:"TRY",notes:"INTERNAL",created_at:"2026-01-01"}],application_followups:[]} as unknown as LocalData;
 m.read.mockImplementation(async()=>data);
 m.mutate.mockImplementation(async(fn:(d:LocalData)=>unknown)=>fn(data));
 m.dealer.mockResolvedValue({dealer_id:"d",role:"manager"});
 m.app.mockImplementation(async()=>data.applications[0]);
 m.offers.mockImplementation(async()=>data.offers);
});
async function token(){return (await createOfferLink("a","Müşteriye açıklama")).split("/").pop()!;}
it("uses opaque rotating tokens and exposes only customer fields",async()=>{
 const first=await token(); const result=await readPublicOffer(first);
 expect(result?.message).toBe("Müşteriye açıklama");
 expect(JSON.stringify(result)).not.toContain("PRIVATE"); expect(JSON.stringify(result)).not.toContain("INTERNAL");
 expect(data.offer_links![0].token_hash).not.toBe(first);
 await token(); expect(await readPublicOffer(first)).toBeNull();
});
it("records one lead response without accepting the offer",async()=>{
 const t=await token();
 expect(await respondPublicOffer(t,"interested")).toBe(true);
 expect(await respondPublicOffer(t,"contact")).toBe(true);
 expect(data.application_followups).toHaveLength(1);
 expect(data.offers[0].status).toBe("pending");expect(data.applications[0].status).toBe("offered");
});
it("rejects malformed, expired and closed links",async()=>{
 expect(await readPublicOffer("guess")).toBeNull();
 const t=await token();
 expect(await respondPublicOffer(t,"accepted")).toBe(false);
 data.offer_links![0].expires_at="2020-01-01";
 expect(await readPublicOffer(t)).toBeNull();expect(await respondPublicOffer(t,"contact")).toBe(false);
 const t2=await token();data.applications[0].status="sold";
 expect(await readPublicOffer(t2)).toBeNull();expect(await respondPublicOffer(t2,"contact")).toBe(false);
});
it("rejects viewer link generation",async()=>{
 m.dealer.mockResolvedValue({dealer_id:"d",role:"viewer"});
 await expect(token()).rejects.toThrow();expect(m.mutate).not.toHaveBeenCalled();
});
it("closes links for purged records, inactive galleries and superseded offers",async()=>{
 const t=await token();
 data.dealers[0].is_active=false;
 expect(await readPublicOffer(t)).toBeNull();expect(await respondPublicOffer(t,"contact")).toBe(false);
 data.dealers[0].is_active=true; data.applications[0].purged_at="2026-01-02";
 expect(await readPublicOffer(t)).toBeNull();expect(await respondPublicOffer(t,"contact")).toBe(false);
 data.applications[0].purged_at=null;
 data.offers.push({...data.offers[0],id:"new",created_at:"2026-02-01"});
 expect(await readPublicOffer(t)).toBeNull();expect(await respondPublicOffer(t,"contact")).toBe(false);
});
it("only matches submitted unpurged same-dealer phone and vehicle records",async()=>{
 const a=data.applications[0];
 data.applications.push({...a,id:"match",brand:"TOYOTA",model:"Cor olla"},{...a,id:"other",dealer_id:"other"},{...a,id:"purged",purged_at:"2026-01-02"},{...a,id:"different",model:"Yaris"});
 expect((await similarApplications("a")).map(a=>a.id)).toEqual(["match"]);
});
