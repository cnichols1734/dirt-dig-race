// TODO: Define message types sent from client to server
export interface ClientMessage {}

// TODO: Define message types sent from server to client
export interface ServerMessage {}

// TODO: Define all tile types in the game map (dirt, stone, ore, empty, etc.)
export enum TileType {}

// TODO: Define ore types and their properties (iron, gold, crystal, etc.)
export enum OreType {}

// TODO: Define the runtime state of a player (position, health, inventory, upgrades, etc.)
export interface PlayerState {}

// TODO: Define the full game state shared between server and clients
export interface GameState {}

// TODO: Define map generation configuration (dimensions, density, seed, etc.)
export interface MapConfig {}
