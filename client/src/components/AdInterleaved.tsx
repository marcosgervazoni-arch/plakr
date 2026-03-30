/**
 * AdInterleaved — Insere banners between_sections dinamicamente entre itens de listas.
 *
 * Estratégia:
 * - Recebe um array de items e uma função de render
 * - A cada `interval` itens renderizados, injeta um <AdBanner position="between_sections" />
 * - Nunca insere banner antes do primeiro item nem após o último
 * - Só renderiza banners se `showAds` for true (usuário não-Pro)
 *
 * Uso:
 * <AdInterleaved
 *   items={ranking}
 *   showAds={!isPro}
 *   interval={5}
 *   renderItem={(item, idx) => <RankCard key={item.id} item={item} idx={idx} />}
 * />
 */
import React from "react";
import { AdBanner } from "@/components/AdBanner";

interface AdInterleavedProps<T> {
  /** Array de itens a renderizar */
  items: T[];
  /** Se false, renderiza apenas os itens sem banners (usuário Pro) */
  showAds: boolean;
  /** A cada quantos itens inserir um banner. Padrão: 5 */
  interval?: number;
  /** Função de render de cada item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Classe CSS aplicada ao wrapper de cada banner */
  adClassName?: string;
}

export function AdInterleaved<T>({
  items,
  showAds,
  interval = 5,
  renderItem,
  adClassName = "w-full my-2",
}: AdInterleavedProps<T>) {
  if (!items.length) return null;

  // Sem anúncios: renderiza lista pura
  if (!showAds) {
    return <>{items.map((item, idx) => renderItem(item, idx))}</>;
  }

  const result: React.ReactNode[] = [];
  let adCount = 0;

  items.forEach((item, idx) => {
    result.push(renderItem(item, idx));

    // Insere banner após cada `interval` itens, mas nunca após o último
    const isLastItem = idx === items.length - 1;
    const isIntervalHit = (idx + 1) % interval === 0;

    if (isIntervalHit && !isLastItem) {
      adCount++;
      result.push(
        <AdBanner
          key={`ad-interleaved-${adCount}`}
          position="between_sections"
          className={adClassName}
        />
      );
    }
  });

  return <>{result}</>;
}
