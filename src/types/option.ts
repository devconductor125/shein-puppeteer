export class Option<T> {
    value?: T

    constructor(value?: T) {
        this.value = value
    }

    hasValue(): boolean {
        return this.value !== undefined
    }
}