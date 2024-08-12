import * as d3 from 'd3';
import './modal.css';
import { Swatch, Palette } from '../classes';

export class OrganizeModal {
    static { }

    /** @type {HTMLDialogElement} */
    dialog;
    /** @type {d3.Selection} */
    closeButton;
    /** @type {d3.Selection} */
    openButton;
    /** @type {d3.Selection} */
    modal;
    /** @type {d3.Selection} */
    overview;
    /** @type {Map<Swatch,HTMLDivElement>} */
    swatchMap;
    /** @type {Function} */
    callback;

    constructor(dialog, openButton, callback) {
        this.dialog = dialog instanceof HTMLDialogElement ?
            dialog : document.querySelector(dialog);

        this.closeButton = d3.select(this.dialog)
            .on('close', () => this.close())
            .on('mouseup', (event) => {
                // console.log(event);
                if (event.target !== this.dialog) return;
                this.dialog.close();
            })
            .append('button')
            .classed('close', true)
            .text('✖')
            .on('click', () => this.dialog.close());

        this.openButton = openButton instanceof d3.selection ?
            openButton : d3.select(openButton);
        this.openButton.on('click', () => this.open());

        this.modal = d3.select(dialog).select('.modal');
        this.overview = this.modal.select('.overview')
            .call(dragger, this);

        this.swatchMap = new Map();

        this.callback = callback || (() => { });
    }

    open() {
        console.log('Organize');

        this.overview.selectAll('div')
            .data(Palette.collection, d => d.name)
            .join('div')
            .classed('org-wrapper', true)
            .call(wrapper => wrapper
                .append('p')
                .call(editableContent, 'name')
            )
            .append('div')
            .classed('org-palette', true)
            .selectAll('div')
            .data(d => d.swatches, d => d.name)
            .join('div')
            .each((d, i, g) => this.swatchMap.set(d, g[i]))
            .classed('org-swatch', true)
            .style('animation', 'none')
            .style('background-color', d => d.color.formatHex())
            .call(editableContent, 'name');

        this.dialog.showModal();

        this.closeButton.node().focus();
    }

    close() {
        console.log('Done organizing');

        this.overview.selectAll('div').remove();

        this.callback();
    }

    update() {
        this.overview.selectAll('div').remove();

        this.overview.selectAll('div')
            .data(Palette.collection, d => d.name)
            .join('div')
            .classed('org-wrapper', true)
            .call(wrapper => wrapper
                .append('p')
                .call(editableContent, 'name')
            )
            .append('div')
            .classed('org-palette', true)
            .selectAll('div')
            .data(d => d.swatches, d => d.name)
            .join('div')
            .each((d, i, g) => this.swatchMap.set(d, g[i]))
            .classed('org-swatch', true)
            .style('animation', 'none')
            .style('background-color', d => d.color.formatHex())
            .call(editableContent, 'name');

        this.callback();
    }
}

function editableContent(element, property) {
    element
        .attr('contenteditable', 'false')
        .attr('spellcheck', 'false')
        .attr('tabindex', '0')
        .text(d => d[property])
        // .on('input', function (event) {
        //     console.log('input', event);
        // })
        // .on('click', function (event) {
        //     console.log('Click');
        //     event.preventDefault();
        //     d3.select(this).attr('contenteditable', 'true');
        // })
        .on('dblclick', function (event) {
            // console.log('DoubleClick');
            event.preventDefault();
            d3.select(this).attr('contenteditable', 'true');
        })
        .on('keydown', function (event) {
            // console.log(event);
            if (event.key !== 'Enter') return;
            // console.log('Enter', this);
            event.preventDefault();

            const selection = d3.select(this);
            const editable = selection.attr('contenteditable').toLowerCase() === 'true';

            if (editable) {
                selection.attr('contenteditable', 'false');
                this.blur();
            } else {
                selection.attr('contenteditable', 'true');
            }
        })
        // .on('focus', function () {
        //     console.log('focus', this);
        // })
        .on('blur', function () {
            // console.log('blur', this);

            const selection = d3.select(this);
            selection.attr('contenteditable', 'false');

            const datum = selection.datum();
            const text = selection.text();
            datum[property] = text;
            // console.log({ datum, text });
        });
}

const dragHandle = d3.create('div')
    .classed('drag-handle', true)
    .attr('contenteditable', 'false')
    .text('⋮')
    .node();

const swatchPlaceholder = d3.create('div')
    .classed('org-swatch-placeholder', true)
    .node();

function dragger(overview, organizeModal) {

    const drag = {
        /** @type {boolean} */
        active: false,
        /** @type {boolean} */
        clone: false,
        /** @type {d3.Selection<HTMLDivElement, Swatch>} */
        element: null,
        /** @type {Swatch} */
        get swatch() {
            return this.element?.datum()
        },
        reset: function () {
            this.active = false;
            this.clone = false;
            this.element = null;
        }
    };

    const drop = {
        /** @type {boolean} */
        active: false,
        /** @type {Palette} */
        palette: null,
        /** @type {Swatch} */
        swatch: null,
        reset: function () {
            this.active = false;
            this.palette = null;
            this.swatch = null;
        }
    };

    const bucket = d3.create('div')
        .classed('bucket', true);

    overview
        .on('mouseover', function (event) {
            /** @type {HTMLDivElement} */
            const hovered = event.target;
            // console.log(hovered.className, d3.now());

            if (!drag.active) {
                if (hovered.matches('.org-swatch')) {
                    hovered.append(dragHandle);
                } else if (hovered.matches('.drag-handle')) {
                    // console.log('HANDLing');
                } else {
                    dragHandle.remove();
                }
                return;
            }

            if (hovered.matches('.org-swatch')) {
                if (swatchPlaceholder.parentElement === hovered.parentElement &&
                    hovered.compareDocumentPosition(swatchPlaceholder) === Node.DOCUMENT_POSITION_PRECEDING) {
                    // console.log('drop zone after hovered');

                    drop.reset();
                    drop.active = true;
                    drop.palette = d3.select(hovered.parentElement).datum();

                    /** @type {Swatch} */
                    const swatch = d3.select(hovered).datum();
                    if (swatch === swatch.palette.swatches.at(-1)) {
                        hovered.parentElement.appendChild(swatchPlaceholder);
                    } else {
                        const dropSwatchCandidate = drop.palette.swatches[swatch.getIndex() + 1];

                        drag.swatch === dropSwatchCandidate ?
                            drop.active = false :
                            drop.swatch = dropSwatchCandidate;

                        hovered.parentElement
                            .insertBefore(swatchPlaceholder, hovered.nextElementSibling);
                    }

                    return;
                }

                drop.active = true;
                // console.log('zone', hovered);
                drop.swatch = d3.select(hovered).datum();

                hovered.parentElement
                    .insertBefore(swatchPlaceholder, hovered);

            } else if (hovered.matches('.org-swatch-placeholder')) {
                // console.log('PLACEHOLDing');

            } else if (hovered.matches('.org-palette')) {
                // console.log('PALETTing');
                drop.reset();
                drop.active = true;
                drop.palette = d3.select(hovered).datum();

                hovered.appendChild(swatchPlaceholder);

            } else {
                drop.reset();

                swatchPlaceholder.remove();
            }
        })

    /** @param {d3.D3DragEvent} event */
    function dragstart(event) {
        // console.log('dragStart', event);

        const element = event.sourceEvent.target.parentNode;
        drag.element = d3.select(element);
        drag.active = true;

        const [left, top] = d3.pointer(event, this);
        const parentBBox = overview.node().getBoundingClientRect();
        const childBBox = element.getBoundingClientRect();
        const x = childBBox.x + childBBox.width / 2 - parentBBox.x;
        const y = childBBox.y + childBBox.height / 2 - parentBBox.y;
        const w = childBBox.width;
        const h = childBBox.height;
        // console.log({ element, x, y, w, h });

        this.append(bucket
            .classed('unfocus', false)
            .each(resetCSSAnimation)
            .classed('focus', true)
            .style('--left', left + 'px')
            .style('--top', top + 'px')
            .style('--x', x + 'px')
            .style('--y', y + 'px')
            .style('--w', w + 'px')
            .style('--h', h + 'px')
            .style('background-color', drag.element.style('background-color'))
            .node());

        dragHandle.remove();

        if (event.sourceEvent.altKey) {
            drag.clone = true;
            element.blur();
        } else {
            drag.element.style('display', 'none');
        }

        organizeModal.modal.classed('drag-active', true);
    }

    /** @param {d3.D3DragEvent} event */
    function dragging(event) {
        // console.log(event);
        const [x, y] = d3.pointer(event, this);

        bucket
            .style('--left', x + 'px')
            .style('--top', y + 'px');
    }

    /** @param {d3.D3DragEvent} event */
    function dragend(event) {
        // console.log('dragEnd', event);

        const parentBBox = overview.node().getBoundingClientRect();
        const child = drop.active ? swatchPlaceholder :
            (swatchPlaceholder.remove(), drag.element.style('display', null).node())
        const childBBox = child.getBoundingClientRect();
        const x = childBBox.x + childBBox.width / 2 - parentBBox.x;
        const y = childBBox.y + childBBox.height / 2 - parentBBox.y;
        const w = childBBox.width;
        const h = childBBox.height;

        let dragSwatch;

        if (drop.active) {
            if (drag.clone) {
                const { name, color } = drag.swatch;
                dragSwatch = new Swatch(name, color.copy());
            } else {
                dragSwatch = drag.swatch;
                dragSwatch.palette.swatches.splice(dragSwatch.getIndex(), 1);
            }

            if (drop.swatch) {
                dragSwatch.palette = drop.swatch.palette;
                const index = drop.swatch.getIndex();
                drop.swatch.palette.swatches.splice(index, 0, dragSwatch);
            } else if (drop.palette) {
                dragSwatch.palette = drop.palette;
                drop.palette.swatches.push(dragSwatch);
            } else { debugger }

            organizeModal.update();
        } else {
            dragSwatch = drag.swatch;
        }

        // focus on swatch preview
        const preview = organizeModal.swatchMap.get(dragSwatch);
        preview.focus();
        preview.style.animation = 'none';
        preview.offsetHeight;
        preview.style.animation = null;

        this.append(bucket
            .classed('focus', false)
            .each(resetCSSAnimation)
            .classed('unfocus', true)
            .style('--x', x + 'px')
            .style('--y', y + 'px')
            .style('--w', w + 'px')
            .style('--h', h + 'px')
            .node());

        organizeModal.modal.classed('drag-active', false);

        drag.reset();
        drop.reset();
    }

    return d3.drag()
        .filter(function (event) {
            // console.log(event);

            return (
                !event.ctrlKey &&
                !event.button &&
                event.srcElement === dragHandle
            );
        })
        .on('start', dragstart)
        .on('drag', dragging)
        .on('end', dragend)
        (overview);
}

/**
 * Make sure there is no overlap in CSS animations
 * @param {*} d 
 * @param {number|0} i 
 * @param {d3.BaseType[]} g 
 * @example d3.select('*').each(resetCSSAnimation);
 */
function resetCSSAnimation(d, i, g) {
    const element = g[i];
    element.style.animation = 'none';
    element.offsetHeight; /* trigger reflow */
    element.style.animation = null;
}
