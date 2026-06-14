/* System / settings — clinical panel of toggles and fields. */

function SettingsScreen() {
  const { Toggle, Field, Card, StatusChip } = OKO;
  return (
    <ScreenShell state="SYSTEM" tone="ok">
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <Card label="OSOBOWOŚĆ" padded>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Toggle label="Tryb proaktywny" sublabel="OKO MOŻE ODEZWAĆ SIĘ PIERWSZE" defaultChecked />
            <Toggle label="Sarkazm" sublabel="POZIOM: WYSOKI" defaultChecked />
            <Toggle label="Współczucie" sublabel="MODUŁ OPCJONALNY" />
          </div>
        </Card>

        <Card label="CZUJNIKI" padded>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Toggle label="Mikrofon" sublabel="NASŁUCH NA KOMENDĘ" defaultChecked />
            <Toggle label="Kamera (oko)" sublabel="ROZPOZNAWANIE SCENY" defaultChecked />
            <Toggle label="Lokalizacja" sublabel="TŁO" />
          </div>
        </Card>

        <Card label="DOSTĘP" padded>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="KLUCZ API" defaultValue="oko-9000-•••••••••" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>WERSJA RDZENIA</span>
              <StatusChip tone="neutral" dot={false}>v1.4.0</StatusChip>
            </div>
          </div>
        </Card>
      </div>
    </ScreenShell>
  );
}

Object.assign(window, { SettingsScreen });
