/**
 * AdInterleaved — Insere banners between_sections dinamicamente entre itens de listas.
 *
 * Estratégia:
 * - Recebe um array de items e uma função de render
 * - A cada `interval` itens renderizados, injeta um <AdBanner position="between_sections" />
 * - Nunca insere banner antes do primeiro item nem após o último
 * - Só renderiza banners se `showAds` for true (usuário não-Pro)
 * - Suporta `gridClassName` para grades CSS (ex: "grid grid-cols-2 gap-3")
 *   Quando usado em grade, o banner ocupa toda a largura via `adClassName` (ex: "col-span-2")
 * - Aceita `adConfig` para evitar queries duplicadas quando já carregado pelo pai
 *
 * Uso básico (lista):
 * <AdInterleaved
 *   items={ranking}
 *   showAds={!isPro}
 *   interval={5}
 *   adConfig={adConfig}
 *   renderItem={(item, idx) => <RankCard key={item.id} item={item} idx={idx} />}
 * />
 *
 * Uso em grade:
 * <AdInterleaved
 *   items={pools}
 *   showAds={!isPro}
 *   interval={4}
 *   adConfig={adConfig}
 *   gridClassName="grid grid-cols-1 sm:grid-cols-2 gap-3"
 *   adClassName="col-span-1 sm:col-span-2 w-full my-1"
 *   renderItem={(pool) => <PoolCard key={pool.id} pool={pool} />}
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
  /** Classe CSS do container wrapper (ex: "grid grid-cols-2 gap-3"). Se fornecida, envolve os itens num div com essa classe */
  gridClassName?: string;
  /** adConfig já carregado pelo pai — evita queries duplicadas por instância de AdBanner */
  adConfig?: { adsEnabled?: boolean; adsLocalEnabled?: boolean; adNetworkScripts?: unknown } | null;
}

export function AdInterleaved<T>({
  items,
  showAds,
  interval = 5,
  renderItem,
  adClassName = "w-full my-2",
  gridClassName,
  adConfig,
}: AdInterleavedProps<T>) {
  if (!items.length) return null;

  // Sem anúncios: renderiza lista pura (com ou sem grid wrapper)
  if (!showAds) {
    const children = items.map((item, idx) => renderItem(item, idx));
    if (gridClassName) return <div className={gridClassName}>{children}</div>;
    return <>{children}</>;
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
          adConfig={adConfig}
        />
      );
    }
  });

  // Se gridClassName fornecido, envolve tudo num div com essa classe
  if (gridClassName) return <div className={gridClassName}>{result}</div>;
  return <>{result}</>;
}
