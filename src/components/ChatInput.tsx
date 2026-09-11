import React, { useRef, useState, useEffect } from 'react';
import { Send, Image as ImageIcon, X, FileUp, Sparkles, Loader2, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, image?: { dataUrl: string; mimeType: string; name: string }) => void;
  isLoading: boolean;
  onOpenNewDocModal: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onOpenNewDocModal,
}) => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<{
    dataUrl: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview({
          dataUrl: e.target.result as string,
          mimeType: file.type,
          name: file.name,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageSelect(file);
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    if (!text.trim() && !imagePreview) return;

    onSendMessage(text.trim(), imagePreview || undefined);
    setText('');
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent pt-4 pb-4 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Attached image preview banner */}
        {imagePreview && (
          <div className="mb-2.5 flex items-center gap-3 p-2.5 bg-white border border-blue-200 rounded-xl shadow-xs max-w-fit">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 shrink-0">
              <img
                src={imagePreview.dataUrl}
                alt="Preview anexado"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="pr-3">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
                {imagePreview.name}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium">
                Pronto para análise visual de conformidade
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Remover anexo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative bg-white rounded-2xl border transition-all shadow-xs ${
            dragOver
              ? 'border-blue-500 ring-4 ring-blue-500/10'
              : 'border-slate-300 focus-within:border-blue-900 focus-within:ring-3 focus-within:ring-blue-900/10'
          }`}
        >
          <textarea
            ref={textareaRef}
            id="chat-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              imagePreview
                ? "Faça uma pergunta sobre esta imagem (ex: 'Verifique se os degraus e guarda-corpo atendem à norma NBR 9050')..."
                : "Consulte uma norma, artigo de lei, código de obras ou envie uma foto de obra/projeto..."
            }
            rows={1}
            className="w-full pl-4 pr-28 py-3.5 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none min-h-[52px]"
          />

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="image-file-input"
          />

          {/* Action buttons inside the right of input */}
          <div className="absolute right-2 bottom-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Anexar foto de obra, escada, rampa ou planta (JPG/PNG)"
              className="p-2 rounded-xl text-slate-500 hover:text-blue-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenNewDocModal}
              disabled={isLoading}
              title="Subir nova lei ou código de obras em PDF/Texto"
              className="p-2 rounded-xl text-slate-500 hover:text-blue-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 hidden sm:flex"
            >
              <FileUp className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isLoading || (!text.trim() && !imagePreview)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
              title="Enviar consulta jurídica"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Helper bottom line */}
        <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-400">
          <span className="hidden sm:inline">
            Pressione <kbd className="px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-700 font-mono text-[10px]">Enter</kbd> para enviar, <kbd className="px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-700 font-mono text-[10px]">Shift+Enter</kbd> para pular linha
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Sparkles className="w-3 h-3 text-blue-700" />
            Gemini 3.8 Flash com busca no banco legislativo
          </span>
        </div>
      </div>
    </div>
  );
};
