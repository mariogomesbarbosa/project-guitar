import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore.ts';
import { audioEngine, AudioEngine } from '../audio/AudioEngine.ts';
import {
  Mic,
  MicOff,
  Volume2,
  RefreshCw,
  Check,
  Radio,
  X,
  Sliders,
  HelpCircle,
  Laptop,
} from 'lucide-react';

export const AudioDeviceModal: React.FC = () => {
  const {
    isDeviceSelectorOpen,
    setDeviceSelectorOpen,
    isMicActive,
    setMicActive,
    selectedMicDeviceId,
    setSelectedMicDeviceId,
    micRms,
    sensitivity,
    setSensitivity,
  } = useGameStore();

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carrega a lista de dispositivos de microfone conectados ao sistema operacional
  const loadDevices = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const audioInputs = await AudioEngine.getAvailableInputDevices();
      setDevices(audioInputs);

      // Se nenhum device estiver explicitamente selecionado e houver dispositivos, marcar o primeiro ou padrão
      if (!selectedMicDeviceId && audioInputs.length > 0) {
        const defaultDev = audioInputs.find((d: MediaDeviceInfo) => d.deviceId === 'default') || audioInputs[0];
        if (defaultDev) {
          setSelectedMicDeviceId(defaultDev.deviceId);
        }
      }
    } catch (err: unknown) {
      console.error('Erro ao listar dispositivos:', err);
      setErrorMsg('Não foi possível carregar os microfones. Verifique as permissões do navegador.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isDeviceSelectorOpen) {
      loadDevices();
    }
  }, [isDeviceSelectorOpen]);

  // Se o modal não estiver aberto, não renderiza nada
  if (!isDeviceSelectorOpen) return null;

  // Seleciona um dispositivo e inicia ou troca a captura
  const handleSelectDevice = async (deviceId: string) => {
    try {
      setSelectedMicDeviceId(deviceId);
      await audioEngine.setInputDevice(deviceId);
      setMicActive(true);
    } catch (err) {
      console.error('Erro ao alternar dispositivo:', err);
      setErrorMsg('Falha ao conectar a este dispositivo.');
    }
  };

  // Alterna ligar/desligar microfone
  const handleToggleMic = async () => {
    try {
      if (isMicActive) {
        await audioEngine.stop();
        setMicActive(false);
      } else {
        await audioEngine.init(selectedMicDeviceId || undefined);
        await audioEngine.start();
        setMicActive(true);
        loadDevices();
      }
    } catch (err) {
      console.error('Erro ao iniciar microfone:', err);
      setErrorMsg('Não foi possível ativar o microfone.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Seletor de Microfone & Entrada de Áudio
              </h2>
              <p className="text-xs text-zinc-400">
                Dispositivos de som detectados no seu sistema operacional
              </p>
            </div>
          </div>

          <button
            onClick={() => setDeviceSelectorOpen(false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Live Audio Meter & Status Banner */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Nível de Captação em Tempo Real</span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isMicActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {isMicActive ? '● Capturando Som' : '○ Desconectado'}
              </span>
            </div>

            {/* VU Meter Bar */}
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  micRms > 0.015 ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-700'
                }`}
                style={{ width: `${Math.min(100, Math.round(micRms * 1400))}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              Toque uma corda no violão ou fale no microfone para testar o nível de entrada.
            </p>
          </div>

          {/* Device List Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Dispositivos de Entrada Encontrados
              </span>
              <button
                onClick={loadDevices}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Atualizar Lista</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-3">
                {errorMsg}
              </div>
            )}

            {devices.length === 0 && !isLoading ? (
              <div className="p-6 text-center rounded-2xl bg-zinc-950/40 border border-zinc-800 text-zinc-400 text-xs">
                <Laptop className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                <p className="font-semibold text-zinc-300 mb-1">Nenhum microfone encontrado</p>
                <p>Conecte seu microfone ou interface de áudio e clique em "Atualizar Lista".</p>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map((device, idx) => {
                  const isSelected =
                    selectedMicDeviceId === device.deviceId ||
                    (!selectedMicDeviceId && idx === 0);

                  const label =
                    device.label || `Microfone / Entrada ${idx + 1} (Dispositivo do Sistema)`;

                  return (
                    <button
                      key={device.deviceId || `dev-${idx}`}
                      onClick={() => handleSelectDevice(device.deviceId)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500/50 text-white shadow-md shadow-orange-500/10'
                          : 'bg-zinc-950/50 hover:bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isSelected
                              ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                              : 'bg-zinc-800/70 text-zinc-400'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Radio className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate text-zinc-100">
                            {label}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono truncate">
                            {device.deviceId === 'default'
                              ? 'Dispositivo Padrão do Sistema Operacional'
                              : `ID: ${device.deviceId.slice(0, 16)}...`}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          Ativo
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sensitivity Slider */}
          <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/60">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                Sensibilidade do Microfone
              </span>
              <span className="font-mono text-zinc-400">{Math.round(sensitivity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="2.5"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
          </div>

          {/* Helpful Tip for Interfaces / Cables */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-purple-950/20 border border-purple-900/30 text-xs text-zinc-300">
            <HelpCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong>Dica:</strong> Se você usa uma interface USB (Focusrite, Behringer, Guitar Link, etc.) ou cabo P10/P2, selecione a entrada correspondente na lista acima para captar o som limpo da guitarra.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-zinc-900/80">
          <button
            onClick={handleToggleMic}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isMicActive
                ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25'
            }`}
          >
            {isMicActive ? (
              <>
                <MicOff className="w-4 h-4" />
                Desconectar
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Ativar Microfone
              </>
            )}
          </button>

          <button
            onClick={() => setDeviceSelectorOpen(false)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white font-bold text-xs transition-all shadow-md shadow-orange-500/20 cursor-pointer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
