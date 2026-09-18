import { Injectable } from '@angular/core';
import { CosmosClient } from '@azure/cosmos';

@Injectable({
  providedIn: 'root'
})
export class CosmosDbService {
  private endpoint = 'https://<tu-account-cosmos>.documents.azure.com:443/';
  private key = '<tu-primary-key>';
  private client!: CosmosClient;

  constructor() {
    // Para producción, se recomienda realizar las llamadas a Cosmos DB a través de una Azure Function (Backend API)
    // para evitar exponer la Clave Primaria en el código del cliente.
  }

  async initCosmos(): Promise<void> {
    if (!this.client) {
      this.client = new CosmosClient({ endpoint: this.endpoint, key: this.key });
    }
  }

  async guardarMenuSemanal(menuData: any): Promise<void> {
    await this.initCosmos();
    const database = this.client.database('SazonifyDb');
    const container = database.container('Menus');
    await container.items.create(menuData);
  }
}