import { Skin } from '@/types'
import { formatCoins } from '@/lib/utils'

interface ShopItemProps {
  skin: Skin
  owned: boolean
  current: boolean
  canBuy: boolean
  onBuy: () => void
  onSelect: () => void
}

export function ShopItem({
  skin,
  owned,
  current,
  canBuy,
  onBuy,
  onSelect,
}: ShopItemProps) {
  return (
    <div className={`shop-item ${current ? 'current' : ''}`}>
      <div className="shop-item-image">
        <img src={skin.image} alt={skin.name} />
      </div>
      <div className="shop-item-info">
        <h3>{skin.name}</h3>
        {skin.description && <p>{skin.description}</p>}
        <div className="shop-item-price">
          {skin.price === 0 ? 'Бесплатно' : `${formatCoins(skin.price)} 💰`}
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
        ) : (
          <button
            className="btn btn-primary"
            disabled={!canBuy}
            onClick={onBuy}
          >
            Купить
          </button>
        )}
      </div>
    </div>
  )
}
