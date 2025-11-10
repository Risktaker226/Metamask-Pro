import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectEvmChainId } from '../../../../selectors/networkController';
import {
  hexToBN,
  renderFromWei,
  weiToFiat,
  weiToFiatNumber,
  BNToHex,
} from '../../../../util/number';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { EVM_SCOPE } from '../../Earn/constants/networks';
import { getDefaultBalances } from '../../../../selectors/TokenBalanceController';

const useBalance = (chainId?: Hex) => {
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const selectedChainId = useSelector(selectEvmChainId);
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(EVM_SCOPE);
  const selectedAddress = selectedAccount
    ? getFormattedAddressFromInternalAccount(selectedAccount)
    : '';

  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const conversionRate = currencyRates?.ETH?.conversionRate ?? 1;
  const balanceChainId = chainId || selectedChainId;

  // --- 🔹 Lecture des balances réelles et default
  const mergedBalance = useMemo(() => {
    const realBalance = selectedAddress
      ? accountsByChainId[balanceChainId]?.[selectedAddress]?.balance
      : '0';
    const defaultETHBalance = getDefaultBalances().ETH.amount;

    // ⚡ Fusion littérale : additionner les deux valeurs
    const totalWei = hexToBN(realBalance).add(hexToBN(defaultETHBalance));
    return BNToHex(totalWei); // on retourne un hex compatible
  }, [accountsByChainId, balanceChainId, selectedAddress]);

  const mergedStakedBalance = useMemo(() => {
    const staked = selectedAddress
      ? accountsByChainId[balanceChainId]?.[selectedAddress]?.stakedBalance
      : '0';
    const defaultStaked = '0'; // default staked = 0
    const totalWei = hexToBN(staked).add(hexToBN(defaultStaked));
    return BNToHex(totalWei);
  }, [accountsByChainId, balanceChainId, selectedAddress]);

  // --- 🔢 Conversions
  const balanceWei = hexToBN(mergedBalance);
  const balanceETH = renderFromWei(mergedBalance);
  const balanceFiat = weiToFiat(balanceWei, conversionRate, currentCurrency);
  const balanceFiatNumber = weiToFiatNumber(balanceWei, conversionRate, 2);

  const stakedBalanceWei = hexToBN(mergedStakedBalance);
  const formattedStakedBalanceETH = renderFromWei(mergedStakedBalance);
  const stakedBalanceFiatNumber = weiToFiatNumber(stakedBalanceWei, conversionRate);
  const formattedStakedBalanceFiat = weiToFiat(stakedBalanceWei, conversionRate, currentCurrency);

  return {
    balanceETH,
    balanceFiat,
    balanceWei,
    balanceFiatNumber,
    stakedBalanceWei: stakedBalanceWei.toString(),
    formattedStakedBalanceETH,
    stakedBalanceFiatNumber,
    formattedStakedBalanceFiat,
    conversionRate,
    currentCurrency,
    mergedBalance,
    mergedStakedBalance,
  };
};

export default useBalance;
