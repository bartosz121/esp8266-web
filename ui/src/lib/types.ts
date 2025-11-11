export interface Reading {
	id: number;
	timestamp: number; // Unix timestamp in seconds
	tempCo: number;
	tempRoom: number;
	humidity: number;
}
