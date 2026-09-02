// Ícones da UI — Phosphor Icons (@phosphor-icons/react).
// Todos os ícones usados na aplicação passam por estes wrappers, mantendo uma
// assinatura única ({ size?, className?, weight?, color?, style? }) e um traço
// padrão consistente ("bold"). Assim os componentes não importam Phosphor
// diretamente — trocar de biblioteca/estilo é um ponto único de mudança.
import {
  Trophy,
  SoccerBall,
  TShirt,
  X,
  List,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretDown,
  Check,
  Target,
  ShareNetwork,
  MapPin,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";
import type { CSSProperties } from "react";

type IconProps = {
  size?: number;
  className?: string;
  weight?: IconWeight;
  color?: string;
  style?: CSSProperties;
};

// Fabrica um wrapper com tamanho e peso padrão, permitindo sobrescrever
// size/weight/color/style/className por uso. `aria-hidden` sempre (decorativo).
function make(Phic: Icon, defaultSize: number, defaultWeight: IconWeight = "bold") {
  return function IconWrapper({ size = defaultSize, className, weight = defaultWeight, color, style }: IconProps) {
    return <Phic size={size} className={className} weight={weight} color={color} style={style} aria-hidden />;
  };
}

export const TrophyIcon = make(Trophy, 18); // Classificação / destaque de campeão
export const BallIcon = make(SoccerBall, 18); // Jogos
export const ShirtIcon = make(TShirt, 18); // Times
export const CloseIcon = make(X, 16); // Fechar / remover
export const MenuIcon = make(List, 22); // Menu hambúrguer
export const CollapseIcon = make(CaretDoubleLeft, 18); // Recolher sidebar
export const ExpandIcon = make(CaretDoubleRight, 18); // Expandir sidebar
export const ScorerIcon = make(Target, 18); // Artilharia
export const CaretDownIcon = make(CaretDown, 16); // Select (abrir/fechar)
export const CheckIcon = make(Check, 14); // Select (opção marcada)
export const ShareIcon = make(ShareNetwork, 15); // Compartilhar (jogo/escalação)
export const MapPinIcon = make(MapPin, 12); // Local do jogo
