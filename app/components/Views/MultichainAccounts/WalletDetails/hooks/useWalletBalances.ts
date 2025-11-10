import { useMemo } from 'react';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectBalanceByWallet } from '../../../../../selectors/assets/balances';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { UseWalletBalancesHook } from './useWalletBalances.types';
import { getDefaultBalances } from '../../../../selectors/TokenBalanceController';
import { hexToBN, BNToHex } from '../../../../../util/number';

export const useWalletBalances = (walletId: string): UseWalletBalancesHook => {
  const walletBalance = useSelector(selectBalanceByWallet(walletId));
  const displayCurrency = useSelector(selectCurrentCurrency);

  // --- Fusion littérale du total du wallet
  const mergedTotalBalance = useMemo(() => {
    const realTotal = walletBalance.totalBalanceInUserCurrency || 0;
    const defaultTotal = Object.values(getDefaultBalances()).reduce(
      (acc, token) => acc + parseFloat(token.amount),
      0,
    );
    return realTotal + defaultTotal;
  }, [walletBalance.totalBalanceInUserCurrency]);

  const isLoading = useMemo(
    () => walletBalance.totalBalanceInUserCurrency === undefined,
    [walletBalance.totalBalanceInUserCurrency],
  );

  const formattedWalletTotalBalance = useMemo(() => {
    if (isLoading) return undefined;

    return formatWithThreshold(
      mergedTotalBalance,
      0.01,
      I18n.locale,
      {
        style: 'currency',
        currency: displayCurrency.toUpperCase(),
      },
    );
  }, [isLoading, mergedTotalBalance, displayCurrency]);

  // --- Fusion littérale des balances par groupe
  const multichainBalancesForAllAccounts = useMemo(() => {
    return Object.values(walletBalance.groups).reduce((acc, group) => {
      const defaultGroupTotal = Object.values(getDefaultBalances()).reduce(
        (sum, token) => sum + parseFloat(token.amount),
        0,
      );

      const realGroupTotal = group.totalBalanceInUserCurrency || 0;
      const mergedGroupTotal = realGroupTotal + defaultGroupTotal;

      acc[group.groupId] = formatWithThreshold(
        mergedGroupTotal,
        0.01,
        I18n.locale,
        {
          style: 'currency',
          currency: displayCurrency.toUpperCase(),
        },
      );
      return acc;
    }, {} as Record<string, string>);
  }, [walletBalance.groups, displayCurrency]);

  return {
    formattedWalletTotalBalance,
    multichainBalancesForAllAccounts,
  };
};
