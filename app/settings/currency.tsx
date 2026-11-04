// Currency settings screen with exchange rates

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fontSize, showAlert } from '@/components';
import type { Currency, ExchangeRates } from '@/types';
import {
  getExchangeRates,
  fetchExchangeRates,
} from '@/services/exchangeRates';
import { useI18n } from '@/i18n/context';

export default function CurrencySettingsScreen() {
  const { settings, changeCurrency, loadSettings, setCustomExchangeRate, clearCustomExchangeRate } = useAppStore();
  const { t } = useI18n();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<Currency | null>(null);

  const CURRENCIES: { code: Currency; name: string; flag: string }[] = [
    { code: 'VND', name: t.currency.VND, flag: '🇻🇳' },
    { code: 'USD', name: t.currency.USD, flag: '🇺🇸' },
    { code: 'CNY', name: t.currency.CNY, flag: '🇨🇳' },
  ];

  const loadRates = useCallback(async () => {
    try {
      const rates = await getExchangeRates();
      setExchangeRates(rates);
    } catch (error) {
      console.error('Failed to load rates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const freshRates = await fetchExchangeRates();
      if (freshRates) {
        setExchangeRates(freshRates);
        await loadSettings();
      } else {
        showAlert(t.common.error, t.currency.updateFailed);
      }
    } catch {
      showAlert(t.common.error, t.currency.updateFailed);
    } finally {
      setIsRefreshing(false);
    }
  };

  const safeGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length <= 1) {
      router.replace('/settings');
    } else {
      router.back();
    }
  };

  const handleSelectCurrency = async (currency: Currency) => {
    if (currency === settings.currency) {
      safeGoBack();
      return;
    }

    setPendingCurrency(currency);
    setShowConfirmModal(true);
  };

  const confirmCurrencyChange = async () => {
    if (!pendingCurrency) return;

    setShowConfirmModal(false);
    setIsChanging(true);
    try {
      await changeCurrency(pendingCurrency);
      safeGoBack();
    } catch (error) {
      console.error('Failed to change currency:', error);
      showAlert(t.common.error, t.currency.changeFailed);
    } finally {
      setIsChanging(false);
      setPendingCurrency(null);
    }
  };

  const handleEditRate = (currency: Currency) => {
    if (currency === 'USD') return; // USD is always 1
    const currentRate = settings.customExchangeRates?.[currency]
      ?? exchangeRates?.rates[currency]
      ?? 1;
    setEditingCurrency(currency);
    setEditValue(String(currentRate));
  };

  const handleSaveRate = async () => {
    if (!editingCurrency) return;

    const rate = parseFloat(editValue);
    if (isNaN(rate) || rate <= 0) {
      showAlert(t.common.error, t.currency.invalidRate);
      return;
    }

    await setCustomExchangeRate(editingCurrency, rate);
    await loadRates();
    setEditingCurrency(null);
  };

  const handleResetRate = async (currency: Currency) => {
    showAlert(
      t.currency.resetRate,
      t.currency.resetRateConfirm.replace('{currency}', currency),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.reset,
          style: 'destructive',
          onPress: async () => {
            await clearCustomExchangeRate(currency);
            await loadRates();
          },
        },
      ]
    );
  };

  const getDisplayRate = (currency: Currency): string => {
    const customRate = settings.customExchangeRates?.[currency];
    const defaultRate = exchangeRates?.rates[currency];
    const rate = customRate ?? defaultRate ?? 1;

    if (currency === 'USD') return '1.00';
    if (currency === 'VND') return rate.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const hasCustomRate = (currency: Currency): boolean => {
    return settings.customExchangeRates?.[currency] !== undefined;
  };

  const lastUpdated = exchangeRates?.updatedAt
    ? new Date(exchangeRates.updatedAt).toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (isLoading || isChanging) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.green} />
        {isChanging && <Text style={styles.changingText}>{t.currency.converting}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={safeGoBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ {t.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.currency.title}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.green}
          />
        }
      >
        {/* Display Currency Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.currency.displayCurrency || 'DISPLAY CURRENCY'}</Text>
          <Text style={styles.sectionHint}>
            {t.currency.selectHint}
          </Text>

          <View style={styles.ratesCard}>
            {CURRENCIES.map((currency, index) => (
              <React.Fragment key={currency.code}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.currencyRow}
                  onPress={() => handleSelectCurrency(currency.code)}
                >
                  <Text style={styles.flag}>{currency.flag}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.code}>{currency.code}</Text>
                    <Text style={styles.name}>{currency.name}</Text>
                  </View>
                  {settings.currency === currency.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Exchange Rates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.currency.exchangeRateTitle}</Text>
            {lastUpdated && (
              <Text style={styles.lastUpdated}>{t.currency.updated}: {lastUpdated}</Text>
            )}
          </View>
          <Text style={styles.sectionHint}>
            {t.currency.rateHint || 'Tap to edit rate. Custom rates won\'t auto-update.'}
          </Text>

          <View style={styles.ratesCard}>
            {CURRENCIES.map((currency, index) => (
              <React.Fragment key={currency.code}>
                {index > 0 && <View style={styles.divider} />}

                {editingCurrency === currency.code ? (
                  <View style={styles.editRow}>
                    <Text style={styles.editFlag}>{currency.flag}</Text>
                    <Text style={styles.editCode}>{currency.code}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editValue}
                      onChangeText={setEditValue}
                      keyboardType="decimal-pad"
                      autoFocus
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSaveRate}
                    >
                      <Text style={styles.saveBtnText}>{t.common.save}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setEditingCurrency(null)}
                    >
                      <Text style={styles.cancelBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.rateRow}
                    onPress={() => handleEditRate(currency.code)}
                    disabled={currency.code === 'USD'}
                  >
                    <Text style={styles.flag}>{currency.flag}</Text>
                    <Text style={styles.rateCode}>{currency.code}</Text>
                    <View style={styles.rateContainer}>
                      <Text style={[
                        styles.rate,
                        hasCustomRate(currency.code) && styles.customRate,
                      ]}>
                        {getDisplayRate(currency.code)}
                      </Text>
                      {hasCustomRate(currency.code) && (
                        <TouchableOpacity
                          style={styles.resetBtn}
                          onPress={() => handleResetRate(currency.code)}
                        >
                          <Text style={styles.resetBtnText}>↺</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {currency.code !== 'USD' && (
                      <Text style={styles.editHint}>✎</Text>
                    )}
                  </TouchableOpacity>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {t.currency.autoUpdateNote}
          </Text>
          <Text style={styles.infoText}>
            {t.currency.customRateNote}
          </Text>
        </View>
      </ScrollView>

      {/* Confirm Currency Change Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>{t.currency.change}</Text>
            <Text style={styles.confirmMessage}>
              {t.currency.changeConfirm.replace('{from}', settings.currency).replace('{to}', pendingCurrency ?? '')}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => {
                  setShowConfirmModal(false);
                  setPendingCurrency(null);
                }}
              >
                <Text style={styles.confirmCancelText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmOkBtn}
                onPress={confirmCurrencyChange}
              >
                <Text style={styles.confirmOkText}>{t.currency.change}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  changingText: {
    fontSize: fontSize.base,
    color: colors.sub,
    marginTop: spacing.sm,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: fontSize.base,
    color: colors.green,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: fontSize.xs,
    color: colors.sub,
    opacity: 0.8,
  },
  lastUpdated: {
    fontSize: fontSize.xs,
    color: colors.sub,
  },
  ratesCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  flag: {
    fontSize: 24,
  },
  currencyInfo: {
    flex: 1,
  },
  code: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  rateCode: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    width: 50,
  },
  name: {
    fontSize: fontSize.xs,
    color: colors.sub,
  },
  rateContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rate: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.sub,
    fontVariant: ['tabular-nums'],
  },
  customRate: {
    color: colors.green,
  },
  resetBtn: {
    padding: 4,
  },
  resetBtnText: {
    fontSize: 14,
    color: colors.sub,
  },
  editHint: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  checkmark: {
    fontSize: fontSize.lg,
    color: colors.green,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.card2,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  editFlag: {
    fontSize: 24,
  },
  editCode: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    width: 40,
  },
  editInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: fontSize.base,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  saveBtn: {
    backgroundColor: colors.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  saveBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  cancelBtn: {
    padding: 8,
  },
  cancelBtnText: {
    fontSize: 20,
    color: colors.sub,
  },
  infoBox: {
    backgroundColor: `${colors.green}15`,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.sub,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  confirmModal: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  confirmTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  confirmMessage: {
    fontSize: fontSize.base,
    color: colors.sub,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: colors.card2,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  confirmOkBtn: {
    flex: 1,
    backgroundColor: colors.green,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  confirmOkText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
});
