import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Star } from 'lucide-react-native';
import { getAccount, toggleFavorite } from '../services/storage';

/** 결과 화면 헤더 오른쪽 즐겨찾기 별 — 저장된 계좌의 즐겨찾기를 바로 켜고 끈다 */
export default function FavoriteHeaderButton({
  accountId,
}: {
  accountId: string;
}) {
  const [favorite, setFavorite] = useState(
    () => getAccount(accountId)?.isFavorite ?? false,
  );
  const color = favorite ? '#f5a623' : '#8e8e93';
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() =>
        setFavorite(toggleFavorite(accountId)?.isFavorite ?? false)
      }
      accessibilityRole="button"
      accessibilityLabel={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      accessibilityState={{ selected: favorite }}
    >
      <Star
        size={22}
        color={color}
        fill={favorite ? color : 'transparent'}
        strokeWidth={1.8}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
