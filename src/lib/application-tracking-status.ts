export function getTrackingStatus(status: string, reviewStartedAt: string | null) {
  if (status === "archived") return { step: -1, title: "Başvuru kapatıldı", description: "Bu başvuru için süreç sona erdi. Ayrıntılar için galeriyle iletişime geçebilirsiniz." };
  if (status === "rejected") return { step: 2, title: "Teklif sonuçlandı", description: "Teklif kabul edilmedi. Yeni bir değerlendirme için galeriyle iletişime geçebilirsiniz." };
  if (status === "sold") return { step: 2, title: "Süreç tamamlandı", description: "Aracınızın satış süreci tamamlandı. Bizi tercih ettiğiniz için teşekkür ederiz." };
  if (status === "accepted") return { step: 2, title: "Teklif kabul edildi", description: "Sonraki adımlar için galeri ekibi sizinle iletişime geçecek." };
  if (status === "offered") return { step: 2, title: "Teklif hazırlandı", description: "Aracınız için teklif oluşturuldu. Teklifin ayrıntıları için galeri ekibiyle görüşebilirsiniz." };
  if (reviewStartedAt) return { step: 1, title: "Başvurunuz incelemede", description: "Galeri ekibi araç bilgilerinizi ve fotoğraflarınızı değerlendiriyor. Teklif hazırlandığında burada görebilirsiniz." };
  return { step: 0, title: "Başvurunuz alındı", description: "Bilgileriniz galeriye ulaştı ve değerlendirme sırasına alındı. İnceleme başladığında bu sayfa güncellenecek." };
}
