// Ícones da UI — Phosphor Icons (@phosphor-icons/react).
// Mantemos wrappers com os mesmos nomes/assinatura ({ size?, className? })
// para não alterar os consumidores. Peso "bold" para casar com o traço da UI.
import {
  Trophy,
  SoccerBall,
  TreeStructure,
  TShirt,
  Lock,
  X,
  List,
  CaretDoubleLeft,
  CaretDoubleRight,
  Target,
  Cards,
  type Icon,
} from "@phosphor-icons/react";

type IconProps = { size?: number; className?: string };

// Fabrica um wrapper com tamanho padrão e peso consistente.
function make(Phic: Icon, defaultSize: number) {
  return function IconWrapper({ size = defaultSize, className }: IconProps) {
    return <Phic size={size} className={className} weight="bold" aria-hidden />;
  };
}

export const TrophyIcon = make(Trophy, 18); // Classificação
export const BallIcon = make(SoccerBall, 18); // Jogos
export const BracketIcon = make(TreeStructure, 18); // Mata-Mata
export const ShirtIcon = make(TShirt, 18); // Times
export const LockIcon = make(Lock, 18); // Admin
export const CloseIcon = make(X, 16); // Fechar / remover
export const MenuIcon = make(List, 22); // Menu hambúrguer
export const CollapseIcon = make(CaretDoubleLeft, 18); // Recolher sidebar
export const ExpandIcon = make(CaretDoubleRight, 18); // Expandir sidebar
export const ScorerIcon = make(Target, 18); // Artilharia
export const CardIcon = make(Cards, 18); // Suspensões
