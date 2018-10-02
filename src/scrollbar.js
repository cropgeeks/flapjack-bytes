export class ScrollBar {
    constructor(parent_width, parent_height, width, height, vertical) {
        this.parent_width = parent_width;
        this.parent_height = parent_height;
        this.width = width;
        this.height = height;
        this.vertical = vertical;

        this.x = vertical ? parent_width - width : 0;
        this.y = vertical ? 0 : parent_height - height; 
        
        this.widget = new ScrollBarWidget(this.x, this.y, vertical ? width : 20, vertical ? 20 : height);
    }

    render(ctx) {
        ctx.fillStyle = '#eee';
        ctx.strokeStyle = '#ccc';

        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.fillRect(this.x, this.y, this.width, this.height);

        this.widget.render(ctx);
    }

    move(x, y) {
        this.widget.move(x, y);
    }
}

class ScrollBarWidget {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.corner_radius = 5;
    }

    render(ctx) {
        // Set faux rounded corners
        ctx.lineJoin = "round";
        ctx.lineWidth = this.corner_radius;

        ctx.fillStyle = '#aaa';
        ctx.strokeStyle = '#aaa';

        // Change origin and dimensions to match true size (a stroke makes the shape a bit larger)
        ctx.strokeRect(this.x+(this.corner_radius/2), this.y+(this.corner_radius/2), this.width-this.corner_radius, this.height-this.corner_radius);
        ctx.fillRect(this.x+(this.corner_radius/2), this.y+(this.corner_radius/2), this.width-this.corner_radius, this.height-this.corner_radius);
    }

    move(x, y) {
        this.x = x;
        this.y = y;
    }
}