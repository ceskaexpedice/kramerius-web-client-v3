import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'skeletonList',
    standalone: true
})
export class SkeletonListPipe implements PipeTransform {

    transform(data: any[] | null | undefined, count: number, loading?: boolean | null): any[] {
        if (loading || !data) {
            return Array(count).fill(null);
        }
        return data;
    }
}
