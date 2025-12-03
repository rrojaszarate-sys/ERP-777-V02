/**
 * Búsqueda Global - FASE 3.2
 * Componente de búsqueda universal con Ctrl+K / Cmd+K
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Input,
  Listbox,
  ListboxItem,
  ListboxSection,
  Chip,
  Kbd,
  Spinner
} from '@nextui-org/react';
import {
  Search,
  Calendar,
  Users,
  Package,
  FileText,
  DollarSign,
  Briefcase,
  Clock,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../config/supabase';

// Tipos de resultados
interface SearchResult {
  id: string;
  tipo: 'evento' | 'cliente' | 'producto' | 'proyecto' | 'factura' | 'gasto';
  titulo: string;
  subtitulo?: string;
  url: string;
  icono: React.ReactNode;
  fecha?: string;
}

// Iconos por tipo
const TIPO_ICONS = {
  evento: <Calendar className="w-4 h-4 text-blue-500" />,
  cliente: <Users className="w-4 h-4 text-green-500" />,
  producto: <Package className="w-4 h-4 text-orange-500" />,
  proyecto: <Briefcase className="w-4 h-4 text-purple-500" />,
  factura: <FileText className="w-4 h-4 text-cyan-500" />,
  gasto: <DollarSign className="w-4 h-4 text-red-500" />,
};

// Colores por tipo
const TIPO_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'secondary' | 'default' | 'danger'> = {
  evento: 'primary',
  cliente: 'success',
  producto: 'warning',
  proyecto: 'secondary',
  factura: 'default',
  gasto: 'danger',
};

interface GlobalSearchProps {
  onSelect?: (result: SearchResult) => void;
  onNavigate?: (url: string) => void;
}

export function GlobalSearch({ onSelect, onNavigate }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Atajos de teclado (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus en input al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    const stored = localStorage.getItem('erp_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Buscar con debounce
  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const searchResults: SearchResult[] = [];

      // Buscar eventos
      const { data: eventos } = await supabase
        .from('evt_eventos_erp')
        .select('id, clave_evento, nombre_proyecto, fecha_inicio')
        .or(`clave_evento.ilike.%${searchQuery}%,nombre_proyecto.ilike.%${searchQuery}%`)
        .limit(5);

      if (eventos) {
        eventos.forEach(e => {
          searchResults.push({
            id: `evento-${e.id}`,
            tipo: 'evento',
            titulo: e.clave_evento,
            subtitulo: e.nombre_proyecto,
            url: `/eventos/${e.id}`,
            icono: TIPO_ICONS.evento,
            fecha: e.fecha_inicio,
          });
        });
      }

      // Buscar clientes
      const { data: clientes } = await supabase
        .from('evt_clientes_erp')
        .select('id, razon_social, rfc')
        .or(`razon_social.ilike.%${searchQuery}%,rfc.ilike.%${searchQuery}%`)
        .limit(5);

      if (clientes) {
        clientes.forEach(c => {
          searchResults.push({
            id: `cliente-${c.id}`,
            tipo: 'cliente',
            titulo: c.razon_social,
            subtitulo: c.rfc,
            url: `/clientes/${c.id}`,
            icono: TIPO_ICONS.cliente,
          });
        });
      }

      // Buscar productos
      const { data: productos } = await supabase
        .from('inv_productos_erp')
        .select('id, nombre, codigo')
        .or(`nombre.ilike.%${searchQuery}%,codigo.ilike.%${searchQuery}%`)
        .limit(5);

      if (productos) {
        productos.forEach(p => {
          searchResults.push({
            id: `producto-${p.id}`,
            tipo: 'producto',
            titulo: p.nombre,
            subtitulo: p.codigo,
            url: `/inventario/productos/${p.id}`,
            icono: TIPO_ICONS.producto,
          });
        });
      }

      // Buscar proyectos
      const { data: proyectos } = await supabase
        .from('proy_proyectos')
        .select('id, nombre, codigo')
        .or(`nombre.ilike.%${searchQuery}%,codigo.ilike.%${searchQuery}%`)
        .limit(5);

      if (proyectos) {
        proyectos.forEach(p => {
          searchResults.push({
            id: `proyecto-${p.id}`,
            tipo: 'proyecto',
            titulo: p.nombre,
            subtitulo: p.codigo,
            url: `/proyectos/${p.id}`,
            icono: TIPO_ICONS.proyecto,
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce la búsqueda
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      search(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search]);

  // Manejar selección
  const handleSelect = (result: SearchResult) => {
    // Guardar en recientes
    const newRecent = [result, ...recentSearches.filter(r => r.id !== result.id)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('erp_recent_searches', JSON.stringify(newRecent));

    // Callback
    if (onSelect) {
      onSelect(result);
    }
    if (onNavigate) {
      onNavigate(result.url);
    }

    // Cerrar
    setIsOpen(false);
    setQuery('');
  };

  // Limpiar recientes
  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('erp_recent_searches');
  };

  // Agrupar resultados por tipo
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.tipo]) {
      acc[result.tipo] = [];
    }
    acc[result.tipo].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      {/* Botón trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Buscar...</span>
        <Kbd keys={['command']}>K</Kbd>
      </button>

      {/* Modal de búsqueda */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="2xl"
        placement="top"
        backdrop="blur"
        classNames={{
          base: 'mt-20',
          body: 'p-0'
        }}
      >
        <ModalContent>
          <ModalHeader className="flex-col gap-1 pb-0">
            <Input
              ref={inputRef}
              placeholder="Buscar eventos, clientes, productos, proyectos..."
              value={query}
              onValueChange={setQuery}
              startContent={
                isLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <Search className="w-5 h-5 text-gray-400" />
                )
              }
              endContent={
                <Kbd>ESC</Kbd>
              }
              size="lg"
              variant="bordered"
              classNames={{
                input: 'text-lg',
                inputWrapper: 'border-none shadow-none'
              }}
            />
          </ModalHeader>

          <ModalBody className="max-h-96 overflow-y-auto">
            {/* Sin query - mostrar recientes */}
            {query.length < 2 && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="flex justify-between items-center px-2 mb-2">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Búsquedas recientes
                  </span>
                  <button
                    onClick={clearRecent}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Limpiar
                  </button>
                </div>
                <Listbox
                  aria-label="Búsquedas recientes"
                  onAction={(key) => {
                    const result = recentSearches.find(r => r.id === key);
                    if (result) handleSelect(result);
                  }}
                >
                  {recentSearches.map((result) => (
                    <ListboxItem
                      key={result.id}
                      startContent={result.icono}
                      endContent={<ArrowRight className="w-4 h-4 text-gray-400" />}
                      description={result.subtitulo}
                    >
                      {result.titulo}
                    </ListboxItem>
                  ))}
                </Listbox>
              </div>
            )}

            {/* Con query - mostrar resultados */}
            {query.length >= 2 && (
              <div className="p-2">
                {results.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No se encontraron resultados para "{query}"</p>
                    <p className="text-sm mt-1">Intenta con otros términos</p>
                  </div>
                )}

                {Object.entries(groupedResults).map(([tipo, items]) => (
                  <div key={tipo} className="mb-4">
                    <div className="flex items-center gap-2 px-2 mb-2">
                      <Chip
                        size="sm"
                        color={TIPO_COLORS[tipo]}
                        variant="flat"
                      >
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}s
                      </Chip>
                      <span className="text-xs text-gray-400">
                        {items.length} resultado{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <Listbox
                      aria-label={`Resultados de ${tipo}`}
                      onAction={(key) => {
                        const result = items.find(r => r.id === key);
                        if (result) handleSelect(result);
                      }}
                    >
                      {items.map((result) => (
                        <ListboxItem
                          key={result.id}
                          startContent={result.icono}
                          endContent={<ArrowRight className="w-4 h-4 text-gray-400" />}
                          description={result.subtitulo}
                        >
                          <div className="flex items-center gap-2">
                            <span>{result.titulo}</span>
                            {result.fecha && (
                              <span className="text-xs text-gray-400">
                                {new Date(result.fecha).toLocaleDateString('es-MX')}
                              </span>
                            )}
                          </div>
                        </ListboxItem>
                      ))}
                    </Listbox>
                  </div>
                ))}
              </div>
            )}

            {/* Ayuda */}
            {query.length < 2 && recentSearches.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Escribe al menos 2 caracteres para buscar</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <Chip size="sm" variant="flat" color="primary">Eventos</Chip>
                  <Chip size="sm" variant="flat" color="success">Clientes</Chip>
                  <Chip size="sm" variant="flat" color="warning">Productos</Chip>
                  <Chip size="sm" variant="flat" color="secondary">Proyectos</Chip>
                </div>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

export default GlobalSearch;
