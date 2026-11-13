import { Skin } from '@/types'
import { formatCoins } from '@/lib/utils'

interface ShopItemProps {
  skin: Skin
  owned: boolean
  current: boolean
  canBuy: boolean
  pending?: boolean
  onBuy: () => void
  onSelect: () => void
}

export function ShopItem({
  skin,
  owned,
  current,
  canBuy,
  pending,
  onBuy,
  onSelect,
}: ShopItemProps) {
  const isUsd = skin.payment === 'usd'
  const usdLabel =
    typeof skin.usdPrice === 'number'
      ? `$${skin.usdPrice.toFixed(2)}`
      : '$5.00'

  return (
    <div
      className={`shop-item ${current ? 'current' : ''} ${isUsd ? 'shop-item-exclusive' : ''}`}
    >
      <div className="shop-item-image">
        <img src={skin.image} alt={skin.name} />
      </div>
      <div className="shop-item-info">
        <h3>{skin.name}</h3>
        {skin.description && <p>{skin.description}</p>}
        <div className={`shop-item-price ${isUsd ? 'usd' : ''}`}>
          {isUsd
            ? usdLabel
            : skin.price === 0
              ? 'Бесплатно'
              : `${formatCoins(skin.price)} 💰`}
        </div>
      </div>
      <div className="shop-item-action">
        {current ? (
          <button className="btn btn-secondary" disabled>
            Надето
          </button>
        ) : owned ? (
          <button className="btn btn-primary" onClick={onSelect}>
            Надеть
          </button>
        ) : pending ? (
          <button className="btn btn-secondary" disabled>
            Ожидаем оплату…
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled={!canBuy}
            onClick={onBuy}
          >
            {isUsd ? `Купить за $${Number(skin.usdPrice ?? 5).toFixed(0)}` : 'Купить'}
          </button>
        )}
      </div>
    </div>
  )
}
