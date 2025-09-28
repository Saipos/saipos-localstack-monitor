import {
  Database,
  Key,
  Zap,
  Settings,
  Clock,
  Shield,
  X,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react';
import { useState } from 'react';
import { formatBytes, formatTimestamp } from '../../utils/formatters';
import type { DynamoDBTableDescription } from '../../types';

interface TableInfoPanelProps {
  tableDetails: DynamoDBTableDescription;
  onClose: () => void;
}

export function TableInfoPanel({ tableDetails, onClose }: TableInfoPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    keySchema: false,
    gsi: false,
    lsi: false,
    streams: false,
    encryption: false
  });
  const table = tableDetails.Table;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'CREATING': return 'text-yellow-600 bg-yellow-100';
      case 'UPDATING': return 'text-blue-600 bg-blue-100';
      case 'DELETING': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAttributeTypeIcon = (type: string) => {
    switch (type) {
      case 'S': return '📝';
      case 'N': return '🔢';
      case 'B': return '📁';
      default: return '❓';
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({
    id,
    title,
    icon: Icon,
    count
  }: {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <div className="flex items-center space-x-3">
        <Icon className="w-5 h-5 text-blue-600" />
        <span className="font-medium text-gray-900">{title}</span>
        {count !== undefined && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
            {count}
          </span>
        )}
      </div>
      {expandedSections[id] ? (
        <ChevronDown className="w-4 h-4 text-gray-500" />
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-500" />
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{table.TableName}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(table.TableStatus)}`}>
                  {table.TableStatus}
                </span>
                <span className="text-sm text-gray-500">
                  {table.ItemCount.toLocaleString()} items • {formatBytes(table.TableSizeBytes)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-4">

            {/* Overview Section */}
            <div>
              <SectionHeader id="overview" title="Visão Geral" icon={Info} />
              {expandedSections['overview'] && (
                <div className="mt-3 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Criada em</div>
                    <div className="font-medium">{formatTimestamp(table.CreationDateTime)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">ARN</div>
                    <div className="font-medium text-xs font-mono bg-gray-100 p-2 rounded">
                      {table.TableArn || 'N/D'}
                    </div>
                  </div>
                  {table.BillingModeSummary && (
                    <div>
                      <div className="text-sm text-gray-600">Modo de Cobrança</div>
                      <div className="font-medium">{table.BillingModeSummary.BillingMode}</div>
                    </div>
                  )}
                  {table.ProvisionedThroughput && (
                    <div>
                      <div className="text-sm text-gray-600">Throughput Provisionado</div>
                      <div className="font-medium">
                        {table.ProvisionedThroughput.ReadCapacityUnits}L / {table.ProvisionedThroughput.WriteCapacityUnits}E
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Key Schema Section */}
            <div>
              <SectionHeader id="keySchema" title="Esquema de Chaves" icon={Key} count={table.KeySchema?.length} />
              {expandedSections['keySchema'] && (
                <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg">
                  {table.KeySchema?.map((key, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          key.KeyType === 'HASH' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {key.KeyType === 'HASH' ? 'Chave de Partição' : 'Chave de Ordenação'}
                        </div>
                        <span className="font-medium">{key.AttributeName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {table.AttributeDefinitions?.find(attr => attr.AttributeName === key.AttributeName) && (
                          <span className="text-sm text-gray-600">
                            {getAttributeTypeIcon(table.AttributeDefinitions.find(attr => attr.AttributeName === key.AttributeName)!.AttributeType)}
                            {table.AttributeDefinitions.find(attr => attr.AttributeName === key.AttributeName)!.AttributeType}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Global Secondary Indexes */}
            {table.GlobalSecondaryIndexes && table.GlobalSecondaryIndexes.length > 0 && (
              <div>
                <SectionHeader
                  id="gsi"
                  title="Índices Secundários Globais"
                  icon={Zap}
                  count={table.GlobalSecondaryIndexes.length}
                />
                {expandedSections['gsi'] && (
                  <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg">
                    {table.GlobalSecondaryIndexes.map((gsi, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{gsi.IndexName}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(gsi.IndexStatus)}`}>
                              {gsi.IndexStatus}
                            </span>
                          </div>
                          {gsi.ProvisionedThroughput && (
                            <div className="text-sm text-gray-600">
                              {gsi.ProvisionedThroughput.ReadCapacityUnits}L / {gsi.ProvisionedThroughput.WriteCapacityUnits}E
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {gsi.KeySchema.map((key, keyIndex) => (
                            <div key={keyIndex} className="flex items-center space-x-2 text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${
                                key.KeyType === 'HASH' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {key.KeyType === 'HASH' ? 'CP' : 'CO'}
                              </span>
                              <span>{key.AttributeName}</span>
                            </div>
                          ))}
                          <div className="text-sm text-gray-600 mt-2">
                            Projeção: <span className="font-medium">{gsi.Projection.ProjectionType}</span>
                            {gsi.Projection.NonKeyAttributes && (
                              <span> ({gsi.Projection.NonKeyAttributes.join(', ')})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Local Secondary Indexes */}
            {table.LocalSecondaryIndexes && table.LocalSecondaryIndexes.length > 0 && (
              <div>
                <SectionHeader
                  id="lsi"
                  title="Índices Secundários Locais"
                  icon={Settings}
                  count={table.LocalSecondaryIndexes.length}
                />
                {expandedSections['lsi'] && (
                  <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg">
                    {table.LocalSecondaryIndexes.map((lsi, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg border">
                        <h4 className="font-medium mb-3">{lsi.IndexName}</h4>
                        <div className="space-y-2">
                          {lsi.KeySchema.map((key, keyIndex) => (
                            <div key={keyIndex} className="flex items-center space-x-2 text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${
                                key.KeyType === 'HASH' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {key.KeyType === 'HASH' ? 'CP' : 'CO'}
                              </span>
                              <span>{key.AttributeName}</span>
                            </div>
                          ))}
                          <div className="text-sm text-gray-600 mt-2">
                            Projeção: <span className="font-medium">{lsi.Projection.ProjectionType}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Streams */}
            {table.StreamSpecification?.StreamEnabled && (
              <div>
                <SectionHeader id="streams" title="DynamoDB Streams" icon={Clock} />
                {expandedSections['streams'] && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Tipo de Visualização do Stream</div>
                        <div className="font-medium">{table.StreamSpecification.StreamViewType}</div>
                      </div>
                      {table.LatestStreamArn && (
                        <div>
                          <div className="text-sm text-gray-600">ARN do Stream</div>
                          <div className="font-medium text-xs font-mono bg-gray-100 p-2 rounded">
                            {table.LatestStreamArn}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Encryption */}
            {table.SSEDescription && (
              <div>
                <SectionHeader id="encryption" title="Criptografia" icon={Shield} />
                {expandedSections['encryption'] && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Status</div>
                        <div className="font-medium">{table.SSEDescription.Status}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Tipo de Criptografia</div>
                        <div className="font-medium">{table.SSEDescription.SSEType}</div>
                      </div>
                      {table.SSEDescription.KMSMasterKeyArn && (
                        <div className="col-span-2">
                          <div className="text-sm text-gray-600">ARN da Chave KMS</div>
                          <div className="font-medium text-xs font-mono bg-gray-100 p-2 rounded">
                            {table.SSEDescription.KMSMasterKeyArn}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}